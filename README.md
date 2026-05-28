# Automated Employee Payroll Pipeline (AEPP)

A highly scalable, asynchronous web application designed to automate the ingestion of employee payroll data, generate secure cryptographic PDF salary slips, and dispatch them via standard email protocols. 

This project was built as a submission for the **Nippon Toyota Internship Practical Evaluation (Task 1)**.

## 🚀 Enterprise Engineering Focus
Unlike standard synchronous CRUD applications, AEPP is engineered to handle massive throughput (scaling from 50 to 1,000+ employees) without memory bottlenecks or third-party rate-limit rejections.

* **Asynchronous Worker Pools:** CPU-heavy PDF generation (Playwright) and I/O-heavy email dispatches (Resend/SendGrid) are completely decoupled from the main web server using Redis task queues.
* **Algorithmic Rate Limiting:** Outbound emails are governed by a token-bucket algorithm to prevent IP blacklisting from SMTP providers.
* **Zero-Trust Storage:** PDFs are never stored on local disk. They are pushed to a private AWS S3 bucket and exposed strictly via 7-day cryptographic Presigned URLs.
* **Fault Tolerance:** Network anomalies trigger an exponential backoff system (2s, 4s, 8s) before routing completely failed jobs to a Dead Letter Queue (DLQ).

## 🛠️ Technology Stack

**Frontend Interface:**
* Next.js (App Router)
* Tailwind CSS

**Backend Core:**
* FastAPI (Python)
* PostgreSQL (Data Ledger & State Management)
* Redis (Message Queue)

**External Services:**
* Playwright (HTML-to-PDF Engine)
* AWS S3 (Transient Secure Storage)
* Resend / SendGrid (Transactional Email API)

---

## 💻 Local Development Setup

Follow these instructions to run the entire pipeline locally.

### Prerequisites
* Node.js (v18+)
* Python (3.10+)
* PostgreSQL (Running locally or via Docker)
* Redis (Running locally or via Docker)

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/aepp.git](https://github.com/yourusername/aepp.git)
cd aepp