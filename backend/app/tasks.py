import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.celery_app import celery_app
from app.database import SessionLocal, engine
from app.models import PayrollBatch, SalarySlip, BatchStatus
from app.payload_engine import generate_salary_slip_pdf, upload_to_s3

async def _process_batch_async(batch_id: str):
    """Asynchronous core logic for the worker to execute."""
    try:
        async with SessionLocal() as db:
            stmt = (
                select(PayrollBatch)
                .where(PayrollBatch.id == uuid.UUID(batch_id))
            )
            result = await db.execute(stmt)
            batch = result.scalar_one_or_none()

            if not batch:
                raise ValueError(f"Batch {batch_id} not found in database.")

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
                
                pdf_bytes = generate_salary_slip_pdf(employee, slip, batch.month_year)
                secure_url = upload_to_s3(pdf_bytes, filename)
                print(f"[WORKER] S3 Upload Success -> {employee.email}")
                
            batch.status = BatchStatus.COMPLETED
            await db.commit()
            print(f"[WORKER] Batch {batch_id} processing successfully completed.")
            
    finally:
        # CRITICAL FIX: Dispose of the async connection pool before the event loop closes.
        # This prevents "Event loop is closed" errors if Celery retries the task.
        await engine.dispose()


@celery_app.task(name="process_payroll_batch", bind=True, max_retries=3)
def process_payroll_batch(self, batch_id: str):
    """
    Synchronous Celery task wrapper that spins up the async event loop.
    """
    try:
        print(f"[WORKER] Picked up job for batch: {batch_id}")
        asyncio.run(_process_batch_async(batch_id))
        return {"status": "completed", "batch_id": batch_id}
        
    except Exception as exc:
        print(f"[WORKER] Error processing batch {batch_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)