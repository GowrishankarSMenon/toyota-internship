### 🧪 Automated Testing (TDD)
This project enforces Test-Driven Development (TDD). The backend test suite utilizes `pytest` with `pytest-asyncio` for asynchronous endpoint testing. 

An isolated test database (`aepp_test_db`) is dynamically spun up and torn down during the test lifecycle to ensure data integrity.

**To run the test suite:**
```bash
cd backend
pytest -v
```

## 🏗️ System Architecture

![AEPP System Architecture](images/aepp_architecture.svg)
*High-level system architecture and data flow mapping the core processing pipeline.*


![Initial Architecture Sketch](images/initial-sketch.png)

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

### Step 5: The Professional Commit
Now that the foundation is laid, let's lock it into version control. Go back to your terminal, ensure you are in the root of the project (outside the backend folder), and run these commands:

```bash
git clone https://github.com/yourusername/aepp.git
cd aepp
```
