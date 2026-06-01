import os
import boto3
from botocore.config import Config
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from datetime import datetime

def get_s3_client():
    """Initializes and returns a boto3 S3 client."""
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION"),
        config=Config(signature_version='s3v4')
    )

def fetch_logo_from_s3(s3_key):
    """Fetches a logo image from S3 directly into memory for ReportLab."""
    if not s3_key:
        return None
    try:
        s3_client = get_s3_client()
        bucket_name = os.getenv("S3_BUCKET_NAME")
        response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
        image_bytes = response['Body'].read()
        return ImageReader(BytesIO(image_bytes))
    except Exception as e:
        print(f"Failed to fetch logo from S3: {e}")
        return None

def generate_salary_slip_pdf(employee, slip, month_year, organization):
    """Generates a professional PDF salary slip in memory, dynamically styled per organization."""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    
    # 1. Corporate Header & Dynamic Logo
    if organization.logo_s3_key:
        logo_img = fetch_logo_from_s3(organization.logo_s3_key)
        if logo_img:
            # Draw logo at top left (x=50, y=730) scaled to a clean bounding box
            c.drawImage(logo_img, 50, 720, width=100, height=50, preserveAspectRatio=True, mask='auto')
            header_x_offset = 170  # Shift text to the right if logo exists
        else:
            header_x_offset = 50
    else:
        header_x_offset = 50

    c.setFont("Helvetica-Bold", 24)
    c.drawString(header_x_offset, 750, organization.name)
    
    c.setFont("Helvetica", 10)
    if organization.address:
        c.drawString(header_x_offset, 735, organization.address)
        
    c.setFont("Helvetica-Bold", 12)
    c.drawString(header_x_offset, 715, f"Confidential Salary Slip | {month_year}")
    
    c.line(50, 700, 550, 700)
    
    # 2. Employee Details
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 670, "Employee Details")
    c.setFont("Helvetica", 12)
    c.drawString(50, 650, f"Name: {employee.name}")
    c.drawString(50, 630, f"Employee ID: {employee.id}")
    c.drawString(300, 650, f"Designation: {employee.designation}")
    c.drawString(300, 630, f"Email: {employee.email}")
    
    c.line(50, 610, 550, 610)
    
    # 3. Salary Breakdown
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 580, "Earnings & Deductions")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, 550, f"Base Salary: Rs. {slip.base_salary:,.2f}")
    c.drawString(50, 530, f"House Rent Allowance (HRA): Rs. {slip.hra:,.2f}")
    c.drawString(50, 510, f"Other Allowances: Rs. {slip.allowances:,.2f}")
    c.drawString(300, 550, f"Total Deductions: Rs. {slip.deductions:,.2f}")
    
    c.line(50, 480, 550, 480)
    
    # 4. Net Pay Calculation
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 450, f"NET SALARY: Rs. {slip.net_salary:,.2f}")
    
    # Footer & Custom Messaging
    c.setFont("Helvetica-Oblique", 10)
    if organization.custom_message:
        c.drawString(50, 120, organization.custom_message)
        
    c.drawString(50, 100, "This is a system generated document and does not require a signature.")
    c.drawString(50, 85, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

def upload_to_s3(pdf_bytes, filename):
    """Uploads bytes to AWS S3 and returns a 7-day presigned secure URL."""
    s3_client = get_s3_client()
    bucket_name = os.getenv("S3_BUCKET_NAME")
    
    s3_client.put_object(
        Bucket=bucket_name,
        Key=filename,
        Body=pdf_bytes,
        ContentType='application/pdf'
    )
    
    url = s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket_name, 'Key': filename},
        ExpiresIn=604800
    )
    
    return url