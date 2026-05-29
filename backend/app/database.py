import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from the .env file
load_dotenv()

# We look for a test database URL first, otherwise default to the live database
DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", 
    os.getenv("DATABASE_URL")
)

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set!")

engine = create_async_engine(DATABASE_URL, echo=False, future=True)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()