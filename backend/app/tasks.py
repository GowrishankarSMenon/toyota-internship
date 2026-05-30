import os
import asyncio
import uuid
import resend
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.celery_app import celery_app
from app.database import SessionLocal, engine
from app.models import PayrollBatch, SalarySlip, BatchStatus
from app.payload_engine import generate_salary_slip_pdf, upload_to_s3

# Initialize Resend
resend.api_key = os.getenv("EMAIL_API_KEY")
VERIFIED_DOMAIN = os.getenv("VERIFIED_DOMAIN")

# ---------------------------------------------------------
# MICRO-TASK: The Rate-Limited Email Dispatcher
# ---------------------------------------------------------
@celery_app.task(name="send_salary_email", bind=True, max_retries=3, rate_limit="10/s")
def send_salary_email(self, employee_name: str, employee_email: str, month_year: str, secure_url: str, manager_name: str, manager_prefix: str):
    """
    Sends the email using a dynamically constructed, verified sender identity.
    Limited to 10 executions per second across all workers.
    """
    try:
        # Construct the dynamic sender identity (e.g., "Sarah Smith <sarah@payroll.gshankar.dev>")
        dynamic_sender = f"{manager_name} <{manager_prefix}@{VERIFIED_DOMAIN}>"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #2563eb;">Salary Slip: {month_year}</h2>
            <p>Dear {employee_name},</p>
            <p>Your salary slip for <strong>{month_year}</strong> has been generated and securely stored.</p>
            <p>You can access your highly confidential document using the secure link below. This cryptographic link will automatically expire in 7 days.</p>
            <br>
            <a href="{secure_url}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                View Secure Salary Slip
            </a>
            <br><br>
            <p>If you have any discrepancies regarding this payout, please reply directly to this email to reach me.</p>
            <p>Best regards,<br><strong>{manager_name}</strong><br>Nippon Toyota</p>
        </div>
        """

        params = {
            "from": dynamic_sender,
            "to": [employee_email],
            "subject": f"Confidential: Salary Slip for {month_year}",
            "html": html_content,
        }

        response = resend.Emails.send(params)
        print(f"[DISPATCHER] Queued for {employee_email} from {dynamic_sender} | ID: {response['id']}")
        return response

    except Exception as exc:
        print(f"[DISPATCHER] Email failed for {employee_email}: {str(exc)}")
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


# ---------------------------------------------------------
# MACRO-TASK: The Batch Processor (Fan-Out)
# ---------------------------------------------------------
async def _process_batch_async(batch_id: str, manager_name: str, manager_prefix: str):
    """Generates PDFs and fans out email tasks with dynamic sender parameters."""
    try:
        async with SessionLocal() as db:
            stmt = select(PayrollBatch).where(PayrollBatch.id == uuid.UUID(batch_id))
            result = await db.execute(stmt)
            batch = result.scalar_one_or_none()

            if not batch:
                raise ValueError(f"Batch {batch_id} not found.")

            batch.status = BatchStatus.PROCESSING
            await db.commit()

            slips_stmt = (
                select(SalarySlip)
                .where(SalarySlip.batch_id == batch.id)
                .options(selectinload(SalarySlip.employee)) 
            )
            slips_result = await db.execute(slips_stmt)
            slips = slips_result.scalars().all()

            print(f"[WORKER] Found {len(slips)} records for Batch {batch_id}. Starting generation...")

            for slip in slips:
                employee = slip.employee
                filename = f"salary_slips/{batch.month_year.replace(' ', '_')}/{employee.id}_{uuid.uuid4().hex[:8]}.pdf"
                
                # 1. Generate & Upload
                pdf_bytes = generate_salary_slip_pdf(employee, slip, batch.month_year)
                secure_url = upload_to_s3(pdf_bytes, filename)
                
                # 2. Fan-out to the Rate-Limited Email Queue
                send_salary_email.delay(
                    employee_name=employee.name,
                    employee_email=employee.email,
                    month_year=batch.month_year,
                    secure_url=secure_url,
                    manager_name=manager_name,
                    manager_prefix=manager_prefix
                )
                
            batch.status = BatchStatus.COMPLETED
            await db.commit()
            print(f"[WORKER] Batch {batch_id} fully processed and dispatched to email queue.")
            
    finally:
        await engine.dispose()


@celery_app.task(name="process_payroll_batch", bind=True, max_retries=3)
def process_payroll_batch(self, batch_id: str, manager_name: str = "HR Department", manager_prefix: str = "hr"):
    """
    Entry point for the background worker. Defaults to an HR sender if no specific manager is provided.
    """
    try:
        print(f"[WORKER] Picked up job for batch: {batch_id}")
        asyncio.run(_process_batch_async(batch_id, manager_name, manager_prefix))
        return {"status": "completed", "batch_id": batch_id}
        
    except Exception as exc:
        print(f"[WORKER] Error processing batch {batch_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)