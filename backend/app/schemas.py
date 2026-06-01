from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from uuid import UUID

class UploadResponse(BaseModel):
    message: str
    batch_id: Optional[str] = None
    total_records: Optional[int] = None

class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    address: Optional[str] = None
    custom_message: Optional[str] = None
    logo_s3_key: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PayrollPreviewRow(BaseModel):
    employee_id: str
    name: str
    email: str
    designation: str
    month_year: str
    base_salary: float
    hra: float
    allowances: float
    deductions: float
    net_salary: float

class PayrollConfirmRequest(BaseModel):
    organization_id: UUID
    payroll_data: List[PayrollPreviewRow]