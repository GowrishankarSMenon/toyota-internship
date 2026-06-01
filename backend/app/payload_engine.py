import os
import re
from datetime import datetime
from io import BytesIO

import boto3
from botocore.config import Config
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.pdfencrypt import StandardEncryption
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, Image

def get_s3_client():
    """Initializes and returns a boto3 S3 client."""
    return boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION"),
        config=Config(signature_version="s3v4"),
    )

def fetch_logo_from_s3(s3_key):
    """Fetches a logo image from S3 directly into memory."""
    if not s3_key:
        return None
    try:
        s3_client = get_s3_client()
        bucket_name = os.getenv("S3_BUCKET_NAME")
        response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
        # Return raw BytesIO for the Platypus Image component
        return BytesIO(response["Body"].read())
    except Exception as exc:
        print(f"Failed to fetch logo from S3: {exc}")
        return None

def build_pdf_password(employee):
    dob = getattr(employee, "dob", None)
    dob_value = re.sub(r"[^0-9A-Za-z]", "", dob or "")
    employee_id = re.sub(r"[^0-9A-Za-z]", "", str(employee.employee_id or "").strip().upper())

    if dob_value:
        return f"{dob_value}{employee_id}"

    return employee_id or "AEPP"

def generate_salary_slip_pdf(employee, slip, month_year, organization):
    """Generates a professional, auto-flowing PDF salary slip in memory."""
    buffer = BytesIO()
    
    # 1. Setup Encryption
    encryption = StandardEncryption(
        userPassword=build_pdf_password(employee),
        ownerPassword=os.urandom(16).hex(),
        canPrint=1,
        canModify=0,
        canCopy=0,
        canAnnotate=0,
    )

    # 2. Setup Auto-Flowing Document Template
    # Letter width is 612 pts. With 40pt margins, we have 532 pts of working width.
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
        encrypt=encryption
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Modern SaaS Color Palette
    TEXT_MAIN = colors.HexColor("#111827")     # Dark Charcoal
    TEXT_MUTED = colors.HexColor("#6B7280")    # Gray
    BORDER_LIGHT = colors.HexColor("#E5E7EB")  # Light Gray
    BG_HEADER = colors.HexColor("#F9FAFB")     # Very subtle gray
    
    # Typography Styles
    title_style = ParagraphStyle('Title', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=18, textColor=TEXT_MAIN, leading=22)
    address_style = ParagraphStyle('Address', parent=styles['Normal'], fontName='Helvetica', fontSize=9, textColor=TEXT_MUTED, leading=12)
    label_style = ParagraphStyle('Label', parent=styles['Normal'], fontName='Helvetica', fontSize=9, textColor=TEXT_MUTED)
    value_style = ParagraphStyle('Value', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=TEXT_MAIN)
    
    def money(value):
        return f"Rs. {float(value or 0):,.2f}"

    # --- HEADER SECTION ---
    logo_flowable = ""
    if organization.logo_s3_key:
        logo_data = fetch_logo_from_s3(organization.logo_s3_key)
        if logo_data:
            # kind='proportional' ensures the logo scales elegantly without stretching
            logo_flowable = Image(logo_data, width=120, height=40, kind='proportional')

    company_info = [
        Paragraph(organization.name, title_style),
        Paragraph(organization.address or "", address_style),
    ]
    
    # Header Table: Logo on left, Company Info on right
    header_table = Table(
        [[logo_flowable, company_info]], 
        colWidths=[132, 400]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 25))

    # --- DOCUMENT TITLE ---
    doc_title = Table(
        [[Paragraph(f"<font size=14 color='#111827'><b>Salary Slip</b></font><br/><font size=9 color='#6B7280'>Pay Period: {month_year}</font>", styles['Normal'])]],
        colWidths=[532]
    )
    doc_title.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1, TEXT_MAIN),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(doc_title)
    elements.append(Spacer(1, 15))

    # --- EMPLOYEE INFORMATION ---
    emp_data = [
        [Paragraph("Employee Name", label_style), Paragraph(employee.name, value_style), Paragraph("Employee ID", label_style), Paragraph(employee.employee_id, value_style)],
        [Paragraph("Designation", label_style), Paragraph(employee.designation, value_style), Paragraph("Email", label_style), Paragraph(employee.email, value_style)],
    ]
    
    emp_table = Table(emp_data, colWidths=[100, 166, 100, 166])
    emp_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(emp_table)
    elements.append(Spacer(1, 25))

    # --- EARNINGS & DEDUCTIONS ---
    gross_salary = float(slip.base_salary) + float(slip.hra) + float(slip.allowances)
    
    breakdown_data = [
        ["Earnings Head", "Amount", "Deductions Head", "Amount"],
        ["Base Salary", money(slip.base_salary), "Deductions", money(slip.deductions)],
        ["HRA", money(slip.hra), "", ""],
        ["Allowances", money(slip.allowances), "", ""],
        ["Gross Earnings", money(gross_salary), "Total Deductions", money(slip.deductions)]
    ]
    
    breakdown_table = Table(breakdown_data, colWidths=[150, 116, 150, 116])
    breakdown_table.setStyle(TableStyle([
        # Header Row Styling
        ('BACKGROUND', (0,0), (-1,0), BG_HEADER),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0,0), (-1,0), TEXT_MUTED),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BOTTOMPADDING', (0,0), (-1,0), 10),
        ('TOPPADDING', (0,0), (-1,0), 10),
        
        # Data Row Styling
        ('FONTNAME', (0,1), (-1,-2), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-2), 10),
        ('TEXTCOLOR', (0,1), (-1,-2), TEXT_MAIN),
        ('BOTTOMPADDING', (0,1), (-1,-2), 8),
        ('TOPPADDING', (0,1), (-1,-2), 8),
        ('LINEBELOW', (0,1), (-1,-3), 0.5, BORDER_LIGHT), # Inner lines
        
        # Footer Row (Gross/Total) Styling
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,-1), (-1,-1), 10),
        ('TEXTCOLOR', (0,-1), (-1,-1), TEXT_MAIN),
        ('LINEABOVE', (0,-1), (-1,-1), 1, TEXT_MAIN),
        ('TOPPADDING', (0,-1), (-1,-1), 10),
    ]))
    elements.append(breakdown_table)
    elements.append(Spacer(1, 25))

    # --- NET PAY CALLOUT ---
    net_pay_data = [
        ["Net Salary Payable:", money(slip.net_salary)]
    ]
    # Sleek, minimal dark box for the final payout
    net_pay_table = Table(net_pay_data, colWidths=[382, 150])
    net_pay_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), TEXT_MAIN),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.white),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 12),
        ('ALIGN', (0,0), (0,0), 'RIGHT'),
        ('ALIGN', (1,0), (1,0), 'LEFT'),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
    ]))
    elements.append(net_pay_table)
    elements.append(Spacer(1, 40))

    # --- FOOTER ---
    footer_text = "This is a system generated document and does not require a signature."
    if organization.custom_message:
        footer_text += f"<br/><br/>{organization.custom_message}"
        
    elements.append(Paragraph(f"<font color='#9CA3AF'>{footer_text}</font>", label_style))

    # 3. Build and compile the PDF
    doc.build(elements)
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
        ContentType="application/pdf",
    )

    url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket_name, "Key": filename},
        ExpiresIn=604800,
    )

    return url