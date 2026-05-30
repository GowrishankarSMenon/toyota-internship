import os
import boto3
from botocore.config import Config
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from datetime import datetime

def generate_salary_slip_pdf(employee, slip, month_year):
    """Generates a professional PDF salary slip in memory."""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    
    # 1. Corporate Header
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, 750, "Nippon Toyota")
    c.setFont("Helvetica", 12)
    c.drawString(50, 730, f"Confidential Salary Slip | {month_year}")
    
    c.line(50, 715, 550, 715)
    
    # 2. Employee Details
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 680, "Employee Details")
    c.setFont("Helvetica", 12)
    c.drawString(50, 660, f"Name: {employee.name}")
    c.drawString(50, 640, f"Employee ID: {employee.id}")
    c.drawString(300, 660, f"Designation: {employee.designation}")
    c.drawString(300, 640, f"Email: {employee.email}")
    
    c.line(50, 620, 550, 620)
    
    # 3. Salary Breakdown
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 590, "Earnings & Deductions")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, 560, f"Base Salary: Rs. {slip.base_salary:,.2f}")
    c.drawString(50, 540, f"House Rent Allowance (HRA): Rs. {slip.hra:,.2f}")
    c.drawString(50, 520, f"Other Allowances: Rs. {slip.allowances:,.2f}")
    c.drawString(300, 560, f"Total Deductions: Rs. {slip.deductions:,.2f}")
    
    c.line(50, 490, 550, 490)
    
    # 4. Net Pay Calculation
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 460, f"NET SALARY: Rs. {slip.net_salary:,.2f}")
    
    # Footer
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, 100, "This is a system generated document and does not require a signature.")
    c.drawString(50, 85, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

def upload_to_s3(pdf_bytes, filename):
    """Uploads bytes to AWS S3 and returns a 7-day presigned secure URL."""
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION"),
        config=Config(signature_version='s3v4')
    )
    bucket_name = os.getenv("S3_BUCKET_NAME")
    
    # Upload the file
    s3_client.put_object(
        Bucket=bucket_name,
        Key=filename,
        Body=pdf_bytes,
        ContentType='application/pdf'
    )
    
    # Generate the cryptographic presigned URL (Expires in 7 days / 604800 seconds)
    url = s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket_name, 'Key': filename},
        ExpiresIn=604800
    )
    
    return url