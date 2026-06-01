import uuid
import enum
from sqlalchemy import Column, String, Integer, Numeric, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base

# Enums for tracking pipeline execution states
class BatchStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class SlipStatus(str, enum.Enum):
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    EMAILED = "EMAILED"
    FAILED = "FAILED"

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    address = Column(String(512), nullable=True)
    custom_message = Column(String(512), nullable=True)
    logo_s3_key = Column(String(512), nullable=True)

    # Relationships
    employees = relationship("Employee", back_populates="organization", cascade="all, delete-orphan")
    batches = relationship("PayrollBatch", back_populates="organization", cascade="all, delete-orphan")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(50), primary_key=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    designation = Column(String(255), nullable=False)
    dob = Column(String(20), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="employees")
    salary_slips = relationship("SalarySlip", back_populates="employee")

class PayrollBatch(Base):
    __tablename__ = "payroll_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    month_year = Column(String(20), nullable=False)  # e.g., "October 2023"
    total_records = Column(Integer, nullable=False)
    status = Column(Enum(BatchStatus), default=BatchStatus.PENDING, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="batches")
    salary_slips = relationship("SalarySlip", back_populates="batch", cascade="all, delete-orphan")

class SalarySlip(Base):
    __tablename__ = "salary_slips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("payroll_batches.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=False)
    
    # Financial Data
    base_salary = Column(Numeric(12, 2), nullable=False)
    hra = Column(Numeric(12, 2), nullable=False)
    allowances = Column(Numeric(12, 2), nullable=False)
    deductions = Column(Numeric(12, 2), nullable=False)
    net_salary = Column(Numeric(12, 2), nullable=False)

    # Storage and Tracking
    pdf_s3_key = Column(String(512), nullable=True)
    status = Column(Enum(SlipStatus), default=SlipStatus.PENDING, nullable=False)
    error_log = Column(String, nullable=True)

    # Relationships
    batch = relationship("PayrollBatch", back_populates="salary_slips")
    employee = relationship("Employee", back_populates="salary_slips")