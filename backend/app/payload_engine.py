import os
from datetime import datetime
from io import BytesIO

import boto3
from botocore.config import Config
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle


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
    """Fetches a logo image from S3 directly into memory for ReportLab."""
    if not s3_key:
        return None
    try:
        s3_client = get_s3_client()
        bucket_name = os.getenv("S3_BUCKET_NAME")
        response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
        image_bytes = response["Body"].read()
        return ImageReader(BytesIO(image_bytes))
    except Exception as exc:
        print(f"Failed to fetch logo from S3: {exc}")
        return None


def generate_salary_slip_pdf(employee, slip, month_year, organization):
    """Generates a professional PDF salary slip in memory, dynamically styled per organization."""
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "SalarySlipTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=colors.white,
    )
    small_style = ParagraphStyle(
        "SalarySlipSmall",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )
    label_style = ParagraphStyle(
        "SalarySlipLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
    )
    value_style = ParagraphStyle(
        "SalarySlipValue",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
    )

    def money(value):
        return f"Rs. {float(value):,.2f}"

    def draw_panel(x, y, width, height, fill_color, stroke_color=None, radius=12):
        pdf.setFillColor(fill_color)
        pdf.setStrokeColor(stroke_color or fill_color)
        pdf.roundRect(x, y, width, height, radius, fill=1, stroke=1 if stroke_color else 0)

    def render_table(table_data, x, y, col_widths, style_commands):
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle(style_commands))
        _, table_height = table.wrapOn(pdf, 0, 0)
        table.drawOn(pdf, x, y - table_height)
        return table_height

    page_width, page_height = letter
    margin = 38
    content_width = page_width - (margin * 2)

    # Page background
    pdf.setFillColor(colors.HexColor("#F1F5F9"))
    pdf.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    draw_panel(margin, 34, content_width, page_height - 68, colors.white)

    # Header band
    header_y = 690
    draw_panel(margin, header_y, content_width, 94, colors.HexColor("#0F172A"))

    logo_x = margin + 18
    if organization.logo_s3_key:
        logo_img = fetch_logo_from_s3(organization.logo_s3_key)
        if logo_img:
            pdf.drawImage(logo_img, logo_x, header_y + 22, width=72, height=36, preserveAspectRatio=True, mask="auto")
            logo_x += 92

    title = Paragraph(organization.name, title_style)
    title.wrapOn(pdf, content_width - 220, 28)
    title.drawOn(pdf, logo_x, header_y + 52)

    address_text = organization.address or ""
    address = Paragraph(address_text, small_style)
    address.wrapOn(pdf, content_width - 220, 18)
    address.drawOn(pdf, logo_x, header_y + 34)

    period = Paragraph(f"Salary Slip | {month_year}", small_style)
    period.wrapOn(pdf, 200, 18)
    period.drawOn(pdf, margin + content_width - 212, header_y + 54)

    pdf.setFont("Helvetica", 8.5)
    pdf.setFillColor(colors.HexColor("#CBD5E1"))
    pdf.drawRightString(margin + content_width - 18, header_y + 34, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Employee information section
    section_y = 610
    draw_panel(margin + 18, section_y, content_width - 36, 56, colors.HexColor("#E2E8F0"))
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin + 30, section_y + 33, "Employee Information")
    pdf.setFont("Helvetica", 8.5)
    pdf.setFillColor(colors.HexColor("#475569"))
    pdf.drawString(margin + 30, section_y + 16, "Employee details and payroll period for this slip")

    employee_rows = [
        [Paragraph("Employee Name", label_style), Paragraph(employee.name, value_style), Paragraph("Employee ID", label_style), Paragraph(employee.id, value_style)],
        [Paragraph("Designation", label_style), Paragraph(employee.designation, value_style), Paragraph("Email", label_style), Paragraph(employee.email, value_style)],
        [Paragraph("Pay Period", label_style), Paragraph(month_year, value_style), Paragraph("Organization", label_style), Paragraph(organization.name, value_style)],
    ]

    employee_table_height = render_table(
        employee_rows,
        margin + 18,
        section_y - 8,
        [100, 220, 96, 180],
        [
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.55, colors.HexColor("#E2E8F0")),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F8FAFC")),
            ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#F8FAFC")),
        ],
    )

    # Salary breakdown section
    breakdown_y = section_y - employee_table_height - 34
    draw_panel(margin + 18, breakdown_y, content_width - 36, 56, colors.HexColor("#E2E8F0"))
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin + 30, breakdown_y + 33, "Earnings & Deductions")
    pdf.setFont("Helvetica", 8.5)
    pdf.setFillColor(colors.HexColor("#475569"))
    pdf.drawString(margin + 30, breakdown_y + 16, "Tabular breakdown of the salary components")

    gross_salary = float(slip.base_salary) + float(slip.hra) + float(slip.allowances)

    breakdown_rows = [
        [Paragraph("Earnings Head", label_style), Paragraph("Amount", label_style), Paragraph("Deductions Head", label_style), Paragraph("Amount", label_style)],
        [Paragraph("Base Salary", value_style), Paragraph(money(slip.base_salary), value_style), Paragraph("Deductions", value_style), Paragraph(money(slip.deductions), value_style)],
        [Paragraph("HRA", value_style), Paragraph(money(slip.hra), value_style), Paragraph("", value_style), Paragraph("", value_style)],
        [Paragraph("Allowances", value_style), Paragraph(money(slip.allowances), value_style), Paragraph("", value_style), Paragraph("", value_style)],
        [Paragraph("Gross Salary", label_style), Paragraph(money(gross_salary), label_style), Paragraph("Net Salary", label_style), Paragraph(money(slip.net_salary), label_style)],
    ]

    breakdown_table_height = render_table(
        breakdown_rows,
        margin + 18,
        breakdown_y - 8,
        [165, 120, 165, 120],
        [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.55, colors.HexColor("#E2E8F0")),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND", (0, 4), (1, 4), colors.HexColor("#DBEAFE")),
            ("BACKGROUND", (2, 4), (3, 4), colors.HexColor("#DCFCE7")),
            ("FONTNAME", (0, 4), (1, 4), "Helvetica-Bold"),
            ("FONTNAME", (2, 4), (3, 4), "Helvetica-Bold"),
        ],
    )

    # Net pay callout
    callout_y = breakdown_y - breakdown_table_height - 28
    draw_panel(margin + 18, callout_y, content_width - 36, 56, colors.HexColor("#0F172A"))
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(margin + 32, callout_y + 31, f"Net Salary Payable: {money(slip.net_salary)}")
    pdf.setFont("Helvetica", 8.5)
    pdf.setFillColor(colors.HexColor("#CBD5E1"))
    pdf.drawString(margin + 32, callout_y + 14, "This is a system generated document and does not require a signature.")

    # Footer message
    pdf.setFont("Helvetica", 8.5)
    pdf.setFillColor(colors.HexColor("#64748B"))
    if organization.custom_message:
        pdf.drawString(margin + 18, 70, organization.custom_message[:115])
    pdf.drawRightString(margin + content_width - 18, 70, "Confidential payroll document")

    pdf.save()
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
