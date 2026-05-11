import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_register():
    response = client.post("/api/v1/register", json={
        "email": "test@example.com",
        "password": "test123"
    })
    assert response.status_code in [201, 409]  # 409 если уже есть

def test_login():
    client.post("/api/v1/register", json={
        "email": "login@example.com",
        "password": "test123"
    })
    response = client.post("/api/v1/login", json={
        "email": "login@example.com",
        "password": "test123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_create_task():
    # Регистрация и логин
    client.post("/api/v1/register", json={
        "email": "task@example.com",
        "password": "test123"
    })
    login = client.post("/api/v1/login", json={
        "email": "task@example.com",
        "password": "test123"
    })
    token = login.json()["access_token"]

    response = client.post(
        "/api/v1/tasks",
        json={"title": "Test Task"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201

def test_get_tasks():
    client.post("/api/v1/register", json={
        "email": "gettasks@example.com",
        "password": "test123"
    })
    login = client.post("/api/v1/login", json={
        "email": "gettasks@example.com",
        "password": "test123"
    })
    token = login.json()["access_token"]

    response = client.get(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
