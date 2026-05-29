import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_upload_valid_csv(async_client: AsyncClient):
    # Simulate csv
    csv_content = (
        "employee_id,name,email,designation,base_salary,hra,allowances,deductions\n"
        "EMP001,John Doe,john@example.com,Engineer,50000,10000,5000,2000\n"
        "EMP002,Jane Smith,jane@example.com,Manager,80000,15000,8000,3000\n"
    )
    files = {"file": ("test_payroll.csv", csv_content, "text/csv")}
    
    response = await async_client.post("/api/upload", files=files)
    
    assert response.status_code == 202
    data = response.json()
    assert data["message"] == "Batch accepted for processing"
    assert "batch_id" in data
    assert data["total_records"] == 2

@pytest.mark.asyncio
async def test_upload_invalid_file_type(async_client: AsyncClient):
    # Simulate an admin accidentally uploading a text file
    files = {"file": ("test_payroll.txt", "dummy content", "text/plain")}
    response = await async_client.post("/api/upload", files=files)
    
    assert response.status_code == 400
    assert response.json()["detail"] == "Only CSV files are allowed"