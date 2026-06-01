import csv
import os
import uuid
from io import StringIO
from datetime import datetime
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException, status, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from pydantic import ValidationError

from app.schemas import UploadResponse, OrganizationResponse, PayrollConfirmRequest
from app.database import get_db
from app.models import Employee, PayrollBatch, SalarySlip, BatchStatus, Organization
from app.payload_engine import get_s3_client
from app.tasks import process_payroll_batch

app = FastAPI(title="AEPP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_employee_id(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized.upper() if normalized else None


def normalize_text_value(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized if normalized else None


def clean_csv_row(row: dict) -> dict:
    return {
        k.strip().lower(): v.strip() if isinstance(v, str) else ""
        for k, v in row.items()
        if k
    }

# ---------------------------------------------------------
# 1. UPLOAD EMPLOYEE ROSTER (CSV 1)
# ---------------------------------------------------------
@app.post("/api/v1/employees/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_employees(
    organization_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    content = await file.read()
    decoded_content = content.decode('utf-8-sig') 
    csv_reader = csv.DictReader(StringIO(decoded_content))
    
    employee_data = []
    for row in csv_reader:
        clean_row = clean_csv_row(row)
        emp_id = normalize_employee_id(
            clean_row.get("employee id", clean_row.get("employee_id", clean_row.get("id")))
        )
        
        if not emp_id:
            continue

        employee_data.append({
            "employee_id": emp_id, # <-- Changed to employee_id
            "organization_id": organization_id,
            "name": clean_row.get("name", "Unknown"),
            "email": clean_row.get("email", "no-email@company.com"),
            "designation": clean_row.get("designation", "Employee"),
            "dob": normalize_text_value(
                clean_row.get("dob", clean_row.get("date_of_birth", clean_row.get("birth_date")))
            )
        })
        
    if not employee_data:
        raise HTTPException(status_code=400, detail="The CSV file is empty or missing 'Employee ID' headers.")

    stmt = pg_insert(Employee).values(employee_data)
    
    # THE FIX: Tell Postgres to use the multi-tenant constraint to detect conflicts
    stmt = stmt.on_conflict_do_update(
        constraint='uix_org_emp_id', 
        set_={
            'name': stmt.excluded.name,
            'email': stmt.excluded.email,
            'designation': stmt.excluded.designation,
            'dob': stmt.excluded.dob 
        }
    )
    await db.execute(stmt)
    await db.commit()

    return {"message": f"Successfully uploaded {len(employee_data)} employees."}


# ---------------------------------------------------------
# 2. UPLOAD SALARY & PREVIEW (CSV 2)
# ---------------------------------------------------------
@app.post("/api/v1/payroll/preview")
async def preview_payroll(
    organization_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    content = await file.read()
    decoded_content = content.decode('utf-8-sig')
    csv_reader = csv.DictReader(StringIO(decoded_content))
    
    preview_data = []
    for row_num, row in enumerate(csv_reader, start=1):
        clean_row = clean_csv_row(row)
        emp_id = normalize_employee_id(
            clean_row.get("employee id", clean_row.get("employee_id", clean_row.get("id")))
        )
        if not emp_id:
            continue
        
        # THE FIX: Look up using Employee.employee_id
        result = await db.execute(
            select(Employee).where(
                func.upper(func.trim(Employee.employee_id)) == emp_id,
                Employee.organization_id == organization_id,
            )
        )
        employee = result.scalar_one_or_none()
        
        if not employee:
            raise HTTPException(
                status_code=404,
                detail=f"Employee ID {emp_id} in row {row_num} was not found for this organization."
            )

        base = float(clean_row.get("base salary", clean_row.get("base_salary", 0)))
        hra = float(clean_row.get("hra", 0))
        allowances = float(clean_row.get("allowances", 0))
        deductions = float(clean_row.get("deductions", 0))
        net = base + hra + allowances - deductions

        preview_data.append({
            "employee_id": str(employee.id), # Pass the internal UUID to the frontend
            "name": employee.name,
            "email": employee.email,
            "designation": employee.designation,
            "month_year": clean_row.get("month/year", clean_row.get("month_year", datetime.now().strftime("%B %Y"))),
            "base_salary": base,
            "hra": hra,
            "allowances": allowances,
            "deductions": deductions,
            "net_salary": net
        })

    return {"preview": preview_data}


# ---------------------------------------------------------
# 3. CONFIRM & TRIGGER AUTOMATION
# ---------------------------------------------------------
@app.post("/api/v1/payroll/process")
async def process_payroll(
    request: PayrollConfirmRequest,
    db: AsyncSession = Depends(get_db)
):
    if not request.payroll_data:
        raise HTTPException(status_code=400, detail="No payroll data provided")

    # Create the batch
    new_batch = PayrollBatch(
        organization_id=request.organization_id,
        month_year=request.payroll_data[0].month_year,
        total_records=len(request.payroll_data),
        status=BatchStatus.PENDING
    )
    db.add(new_batch)
    await db.flush() 

    # Create the slips using dot notation from the Pydantic models
    slip_objects = [
        SalarySlip(
            batch_id=new_batch.id,
            employee_id=row.employee_id,
            base_salary=row.base_salary,
            hra=row.hra,
            allowances=row.allowances,
            deductions=row.deductions,
            net_salary=row.net_salary
        ) for row in request.payroll_data
    ]
    db.add_all(slip_objects)
    await db.commit()

    # Trigger Celery Worker
    process_payroll_batch.delay(str(new_batch.id))

    return {"message": "Automation Triggered", "batch_id": str(new_batch.id)}


# ---------------------------------------------------------
# 4. CREATE ORGANIZATION
# ---------------------------------------------------------
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

@app.post("/api/organizations/login", response_model=OrganizationResponse)
async def login_organization(
    name: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """Logs into an existing organization by looking up its exact name."""
    
    # Search for the organization by name (case-insensitive)
    result = await db.execute(
        select(Organization).where(func.lower(Organization.name) == name.strip().lower())
    )
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(
            status_code=404, 
            detail=f"No workspace found for '{name}'. Please check the spelling or create a new one."
        )
        
    return org