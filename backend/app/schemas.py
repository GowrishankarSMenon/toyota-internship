from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from uuid import UUID

class EmployeeSalaryRow(BaseModel):
    employee_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=2)
    email: EmailStr
    designation: str = Field(..., min_length=2)
    base_salary: float = Field(..., ge=0)
    hra: float = Field(..., ge=0)
    allowances: float = Field(..., ge=0)
    deductions: float = Field(..., ge=0)

class UploadResponse(BaseModel):
    message: str
    batch_id: str
    total_records: int

class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    address: Optional[str] = None
    custom_message: Optional[str] = None
    logo_s3_key: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)