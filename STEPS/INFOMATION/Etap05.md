# Дизайн-система To-Do List

### Цвета
- Основной фон: #F9FAFB (светло-серый)
- Карточки задач: #FFFFFF
- Основной текст: #111827
- Второстепенный текст: #6B7280
- Акцент (кнопки, чекбоксы): #3B82F6 (синий)
- Успех (выполнено): #10B981 (зелёный)

### Шрифты
- Семейство: Inter, system-ui, sans-serif
- Заголовки: 24px, 600
- Задачи: 16px, 400
- Мелкий текст (даты): 12px, 400

### Отступы
- Отступы между задачами: 12px
- Внутренние отступы карточки: 16px
- Отступы по краям экрана: 20px

### Состояния
- Чекбокс невыполненной: пустой круг
- Чекбокс выполненной: круг с галочкой, текст зачёркнут
- Hover на задаче: лёгкая тень

## Локальный сервер, миграции, Postman (BE)
**Запуск сервера:**
```python
bash
cd todo-backend
uvicorn main:app --reload --port 8000
```

### Миграции (Alembic):
```python
bash
alembic init migrations
# Настройка alembic.ini
alembic revision --autogenerate -m "initial"
alembic upgrade head
```
### Postman коллекция (экспорт):
```python
json
{
  "collection": {
    "name": "To-Do List API",
    "requests": [
      {"name": "Register", "method": "POST", "url": "{{base}}/api/register"},
      {"name": "Login", "method": "POST", "url": "{{base}}/api/login"},
      {"name": "Get Tasks", "method": "GET", "url": "{{base}}/api/tasks"},
      {"name": "Create Task", "method": "POST", "url": "{{base}}/api/tasks"},
      {"name": "Update Task", "method": "PUT", "url": "{{base}}/api/tasks/1"},
      {"name": "Delete Task", "method": "DELETE", "url": "{{base}}/api/tasks/1"}
    ]
  }
}
```
## CI настройка (TL)
**Файл** .github/workflows/ci.yml:
```python
yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install ruff pytest
      - run: ruff check .
      - run: pytest tests/
```
### Линтер (ruff) и автоформат (black):
```python
bash
pip install ruff black
ruff check --fix .
black .
```
