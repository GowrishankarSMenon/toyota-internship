import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.database import get_db
from app.main import app

@pytest_asyncio.fixture(scope="function")
async def async_db_session():
    """Yield a mock session bypassing local database requirements for pure API tests."""
    yield None

@pytest_asyncio.fixture(scope="function")
async def async_client(async_db_session):
    """Yields an async HTTP client with the database dependency overridden."""
    async def override_get_db():
        yield async_db_session

    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client