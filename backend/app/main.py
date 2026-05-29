import csv
import uuid
from io import StringIO
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from app.schemas import UploadResponse, EmployeeSalaryRow
from pydantic import ValidationError

app = FastAPI(title="AEPP API")

@app.post("/api/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_payroll_csv(file: UploadFile = File(...)):
    # 1. Validate File Extension
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    # 2. Read and Decode Stream
    content = await file.read()
    decoded_content = content.decode('utf-8')
    csv_reader = csv.DictReader(StringIO(decoded_content))
    
    valid_records = []
    
    # 3. Row-by-Row Schema Validation
    for row_num, row in enumerate(csv_reader, start=1):
        try:
            # Strip whitespace from keys/values in case of sloppy CSV formatting
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

    # TODO: Phase 2 - Initialize PostgreSQL State
    # TODO: Phase 3 - Enqueue Redis Tasks
    
    # 4. Return Immediate 202 Accepted Response
    return UploadResponse(
        message="Batch accepted for processing",
        batch_id=str(uuid.uuid4()),
        total_records=len(valid_records)
    )