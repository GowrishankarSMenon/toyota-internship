import csv
import os
import uuid
from io import StringIO
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, status, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert
from pydantic import ValidationError

from app.schemas import UploadResponse, EmployeeSalaryRow, OrganizationResponse
from app.database import get_db
from app.models import Employee, PayrollBatch, SalarySlip, BatchStatus, Organization
from app.payload_engine import get_s3_client

# Just import the task once from where it is defined
from app.tasks import process_payroll_batch

app = FastAPI(title="AEPP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# FIXED: Matched the route exactly to what the React frontend is calling
@app.post("/api/v1/payroll/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_payroll_csv(
    organization_id: uuid.UUID = Form(...),  # <-- NEW: Capturing the Org ID
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db)
):
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

    # <-- NEW: Injecting the organization_id into the employee records
    employee_data = [{
        "id": row.employee_id,
        "organization_id": organization_id, 
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

    # <-- NEW: Linking the batch to the organization
    new_batch = PayrollBatch(
        organization_id=organization_id,
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

    # Heavy lifting pushed to the Redis background queue
    process_payroll_batch.delay(str(new_batch.id))

    return UploadResponse(
        message="Batch accepted and saved to database",
        batch_id=str(new_batch.id),
        total_records=len(valid_records)
    )

@app.post("/api/organizations", response_model=OrganizationResponse)
async def create_organization(
    name: str = Form(...),
    address: str = Form(None),
    custom_message: str = Form(None),
    logo: UploadFile = File(None),
    db: AsyncSession = Depends(get_db) 
):
    """Creates a new organization and uploads their logo to S3."""
    
    # 1. Initialize the Organization model directly
    new_org = Organization(
        name=name,
        address=address,
        custom_message=custom_message
    )

    # 2. Handle the Logo Upload to AWS S3
    if logo:
        # Generate a unique filename to prevent overwriting
        file_extension = logo.filename.split(".")[-1]
        s3_key = f"logos/{uuid.uuid4()}.{file_extension}"
        
        # Read the file bytes
        file_bytes = await logo.read()
        
        # Upload to S3
        s3_client = get_s3_client()
        bucket_name = os.getenv("S3_BUCKET_NAME")
        
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=file_bytes,
            ContentType=logo.content_type
        )
        
        # Save the S3 path to our database model
        new_org.logo_s3_key = s3_key

    # 3. Save to Database
    db.add(new_org)
    await db.commit()
    await db.refresh(new_org)

    return new_org