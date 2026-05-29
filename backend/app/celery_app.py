import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")
if not REDIS_URL:
    raise ValueError("REDIS_URL is missing. Check your .env file.")

# Initialize Celery app and tell it exactly where to find the tasks
celery_app = Celery(
    "aepp_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['app.tasks']  # <--- THIS IS THE FIX
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    
    # Upstash Serverless Reliability Settings
    broker_connection_retry_on_startup=True,
    broker_pool_limit=None,
    redis_backend_health_check_interval=30,
    broker_transport_options={
        'health_check_interval': 30,
        'visibility_timeout': 3600
    }
)