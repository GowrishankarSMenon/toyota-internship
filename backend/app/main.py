import csv
from io import StringIO
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert
from pydantic import ValidationError

from app.schemas import UploadResponse, EmployeeSalaryRow
from app.database import get_db
from app.models import Employee, PayrollBatch, SalarySlip, BatchStatus
from app.tasks import process_payroll_batch  # NEW IMPORT

app = FastAPI(title="AEPP API")

@app.post("/api/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_payroll_csv(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    content = await file.read()
    decoded_content = content.decode('utf-8')
    csv_reader = csv.DictReader(StringIO(decoded_content))
    
    valid_records = []
    
    for row_num, row in enumerate(csv_reader, start=1):
        try:
            clean_row = {k.strip(): v.strip() for k, v in row.items()}
            valid_record = EmployeeSalaryRow(**clean_row)
            valid_records.append(valid_record)
        except ValidationError as e:
            raise HTTPException(
                status_code=422, 
                detail=f"Validation error on row {row_num}: {e.errors()[0]['msg']}"
            )
    
    if not valid_records:
        raise HTTPException(status_code=400, detail="The CSV file is empty or contains no valid data")

    employee_data = [{
        "id": row.employee_id,
        "name": row.name,
        "email": row.email,
        "designation": row.designation
    } for row in valid_records]

    stmt = pg_insert(Employee).values(employee_data)
    stmt = stmt.on_conflict_do_update(
        index_elements=['id'],
        set_={
            'name': stmt.excluded.name,
            'email': stmt.excluded.email,
            'designation': stmt.excluded.designation
        }
    )
    await db.execute(stmt)

    new_batch = PayrollBatch(
        month_year=datetime.now().strftime("%B %Y"),
        total_records=len(valid_records),
        status=BatchStatus.PENDING
    )
    db.add(new_batch)
    await db.flush() 

    slip_objects = [
        SalarySlip(
            batch_id=new_batch.id,
            employee_id=row.employee_id,
            base_salary=row.base_salary,
            hra=row.hra,
            allowances=row.allowances,
            deductions=row.deductions,
            net_salary=(row.base_salary + row.hra + row.allowances - row.deductions)
        ) for row in valid_records
    ]
    db.add_all(slip_objects)
    
    await db.commit()

    # NEW ACTION: Push the heavy lifting to the Redis background queue
    process_payroll_batch.delay(str(new_batch.id))

    return UploadResponse(
        message="Batch accepted and saved to database",
        batch_id=str(new_batch.id),
        total_records=len(valid_records)
    )