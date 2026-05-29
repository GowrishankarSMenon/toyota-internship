# Asynchronous Enterprise Payroll Pipeline (AEPP)

AEPP is an asynchronous payroll processing system designed to handle bulk employee payroll uploads, generate salary slips, store generated artifacts securely, and dispatch them without blocking API requests.

The system is built around queue-based processing so expensive operations such as PDF generation and email delivery execute outside the request lifecycle.

---

# System Architecture

![System Architecture](images/aepp_architecture.svg)

The system separates request handling from expensive background processing.

### Processing Flow

```text
CSV Upload
    ↓
FastAPI Upload Gateway
    ↓
Validation + Database Insert
    ↓
Redis Queue
    ↓
Background Workers
    ↓
PDF Generation
    ↓
Secure Storage
    ↓
Email Delivery
```

---

# Initial Architecture Design

![Initial Design](images/initial-sketch.png)

The initial design focused on:

- Worker decoupling
- Queue based processing
- Cloud storage integration
- Asynchronous job execution
- Telemetry feedback loops

---

# Key Features

## Asynchronous Processing

Heavy workloads are removed from the API request cycle.

- Upload API returns immediately
- Workers consume jobs asynchronously
- Background processing prevents request blocking

---

## Queue Based Architecture

Redis queues are used to distribute workloads between:

- Upload handlers
- Worker nodes
- PDF generation tasks
- Email delivery tasks

---

## Secure Document Storage

Generated salary slips:

- Are not permanently stored locally
- Are uploaded to cloud storage
- Can be accessed using temporary URLs

---

## Fault Isolation

The system isolates failures between:

- API layer
- Queue layer
- Workers
- Email services

This prevents a single failure from crashing the entire pipeline.

---

# Technology Stack

## Frontend

- Next.js
- Tailwind CSS

## Backend

- FastAPI
- SQLAlchemy
- Alembic
- Celery
- PostgreSQL

## Infrastructure

- Supabase PostgreSQL
- Redis (Upstash)
- AWS S3 / Storage
- Resend / SendGrid

## Testing

- Pytest
- Async Testing

---

# Database Design

![Database Schema](images/supabase_tables.png)

The database consists of three primary entities.

---

## employees

Stores employee metadata.

| Field | Purpose |
|------|------|
| id | Employee identifier |
| name | Employee name |
| email | Employee email |
| designation | Employee role |

---

## payroll_batches

Tracks upload batches.

| Field | Purpose |
|------|------|
| id | Batch identifier |
| month_year | Payroll month |
| total_records | Number of employees |
| status | Batch processing state |

---

## salary_slips

Stores generated payroll records.

Contains:

- Salary components
- Batch relationships
- Processing status
- Storage references
- Error logs

---

# Development Progress

---

## Phase 1 — API Development & Testing

The upload endpoints were implemented with validation before database integration.

### Implemented

- CSV validation
- File type validation
- Batch creation logic
- Async API testing

### Test Execution

![Pytest Results](images/initial_test.png)

Run tests:

```bash
cd backend

pytest -v
```

Example output:

```text
2 passed in 0.04s
```

---

## Phase 2 — Database Infrastructure

Implemented:

- PostgreSQL schema
- SQLAlchemy models
- Alembic migrations
- Batch tracking

Run migrations:

```bash
alembic upgrade head
```

---

## Phase 3 — Upload Pipeline Integration

The API validates uploaded payroll data and immediately returns while processing continues asynchronously.

### Upload Success Proof

![Upload Success](images/file_updload_success.png)

Example response:

```json
{
    "message":"Batch accepted and saved to database",
    "batch_id":"uuid",
    "total_records":2
}
```

Response:

```text
HTTP 202 Accepted
```

This confirms:

- Validation succeeded
- Database insertion succeeded
- Batch creation succeeded
- Processing moved to background systems

---

# Project Structure

```text
EMPLOYEE_MAILER/

├── backend/
│   ├── alembic/
│   │
│   ├── app/
│   │
│   ├── tests/
│   │
│   ├── .env
│   ├── alembic.ini
│   ├── conftest.py
│   └── requirements.txt
│
├── documents/
│
├── images/
│
├── test_csv/
│
├── .gitignore
│
└── README.md
```

---

# Getting Started

## Prerequisites

Install:

- Python 3.10+
- PostgreSQL
- Redis
- Node.js (if frontend used)

Create accounts for:

- Supabase
- Upstash
- AWS (optional)
- Resend / SendGrid

---

# Backend Setup

Clone repository:

```bash
git clone <repository-url>

cd EMPLOYEE_MAILER/backend
```

Create virtual environment:

## Windows

```bash
python -m venv venv

venv\Scripts\activate
```

## Linux / Mac

```bash
python -m venv venv

source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# Configure Environment Variables

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL=

REDIS_URL=

SUPABASE_URL=

SUPABASE_KEY=

AWS_ACCESS_KEY=

AWS_SECRET_KEY=

EMAIL_API_KEY=
```

---

# Run Database Migrations

```bash
alembic upgrade head
```

---

# Start FastAPI Server

```bash
uvicorn app.main:app --reload
```

Default:

```text
http://127.0.0.1:8000
```

---

# Start Workers

Open another terminal:

```bash
celery -A app.celery_app worker --loglevel=info --pool=solo
```

---

# Run Tests

```bash
pytest -v
```

---

# Future Improvements

- Dead Letter Queue support
- Worker autoscaling
- Dashboard telemetry
- Progress tracking UI
- Multi-tenant payroll support

---

# License

MIT License