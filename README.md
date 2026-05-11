# To-Do List App

## Описание
Минималистичный менеджер задач с аутентификацией.

## Функционал
- Регистрация / вход (JWT)
- CRUD задач
- Отметка о выполнении
- Фильтрация: все / активные / выполненные
- Поиск по заголовку

## Технологии
- Backend: FastAPI, SQLAlchemy, SQLite
- Auth: JWT (python-jose, passlib)
- Frontend: HTML + CSS + JS (или React)

## API Эндпоинты
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | /api/register | Регистрация |
| POST | /api/login | Вход |
| GET | /api/tasks | Список задач |
| POST | /api/tasks | Создать |
| PUT | /api/tasks/{id} | Обновить |
| DELETE | /api/tasks/{id} | Удалить |

## Запуск локально
```bash
git clone <repo>
cd todo-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
## Макеты
В процессе разработки, ищите в репозитории
