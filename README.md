# To-Do List App

Минималистичный веб-менеджер задач с аутентификацией, фильтрацией и поиском.

## Функционал
- Регистрация / вход (JWT)
- Создание, редактирование, удаление задач
- Отметка о выполнении
- Фильтрация: все / активные / выполненные
- Поиск по заголовку
- Прогресс-бар выполнения
- Адаптивный дизайн

## Технологии
- Backend: FastAPI, SQLAlchemy, PostgreSQL/SQLite
- Frontend: HTML5, CSS3, Vanilla JS
- Auth: JWT (bcrypt)

## API Эндпоинты
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | /api/register | Регистрация |
| POST | /api/login | Вход |
| GET | /api/tasks | Список задач |
| POST | /api/tasks | Создать |
| PUT | /api/tasks/{id} | Обновить |
| DELETE | /api/tasks/{id} | Удалить |

## Запуск

### Локально (разработка)
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

# Frontend (отдельный сервер)
```bash
cd frontend
python -m http.server 3000
```

## Макеты
В процессе разработки, ищите в репозитории
