# Этап 9. Интеграция Frontend и Backend
## Проверка соответствия логики ТЗ (СА)
### Чек-лист проверки:
| Требование | Как проверяем | Статус |
| --- | --- | --- |
| Регистрация | Создать аккаунт → проверить БД | ✅   |
| Вход | Войти → получить JWT | ✅   |
| Создать задачу | POST /tasks → проверить список | ✅   |
| Нельзя создать пустую | POST с пустым title → 400 | ✅   |
| Отметить выполненной | PATCH /tasks/1 {is_done: true} | ✅   |
| Фильтр по статусу | GET /tasks?filter=active → только активные | ✅   |
| Поиск | GET /tasks?search=купить → только задачи с этим словом | ✅   |
| Удаление | DELETE /tasks/1 → задача пропадает | ✅   |
| Чужая задача | GET /tasks чужого ID → 403 | ✅   |
---
## Проверка вёрстки (UX)
### Что проверяет UX-дизайнер:

# Чек-лист приёмки вёрстки

## Адаптивность
- [ ] На десктопе (1920x1080) всё читается, есть отступы
- [ ] На планшете (768x1024) элементы не наезжают друг на друга
- [ ] На мобильном (375x667) списки удобны для пальцев (минимальная высота touch-цели 44px)

## Корректность отображения
- [ ] Все цвета соответствуют гайдлайнам
- [ ] Шрифты и размеры как в макете
- [ ] Отступы и выравнивание совпадают с Figma

## Состояния
- [ ] Загрузка: показывается скелетон или спиннер
- [ ] Ошибка: показывается понятное сообщение (красным)
- [ ] Пустой список: текст "Нет задач. Создайте первую!"
- [ ] Hover на карточке задачи: визуальный отклик
- [ ] Активный фильтр: подсвечивается

## Анимации
- [ ] Добавление задачи: плавное появление
- [ ] Удаление: плавное исчезновение
- [ ] Отметка о выполнении: анимация чекбокса

---
## Исправление ошибок CORS и форматов (BE)
### Настройка CORS (добавить в main.py):
``` python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend.com"],  # фронтенд URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
### Форматы данных (стандартизация):
``` python
# Все даты в ISO 8601
from datetime import date, datetime

# Пример ответа
{
    "id": 1,
    "title": "Купить молоко",
    "due_date": "2026-05-15",  # YYYY-MM-DD
    "created_at": "2026-05-11T10:30:00"  # ISO с T
}
```
### Пример фронтенд-кода (интеграция):
``` javascript
// login.js
async function login(email, password) {
    const response = await fetch('http://localhost:8000/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        window.location.href = '/tasks.html';
    } else {
        alert('Ошибка входа');
    }
}

// tasks.js
async function getTasks(filter = 'all') {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:8000/api/v1/tasks?filter=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
        return await response.json();
    } else if (response.status === 401) {
        window.location.href = '/login.html';
    }
}

async function createTask(title, dueDate) {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:8000/api/v1/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, due_date: dueDate })
    });

    if (response.ok) {
        refreshTaskList();
    } else {
        const error = await response.json();
        alert(error.detail);
    }
}
```
---
## Мердж веток и сборка проекта (TL)
### Git-стратегия (Git Flow упрощённый):
``` text
main (продакшен)
  └── develop (разработка)
       ├── feature/auth
       ├── feature/tasks
       ├── feature/frontend
       └── release/v1.0
```
### Команды:
``` bash
# Создать фича-ветку
git checkout develop
git pull origin develop
git checkout -b feature/tasks-crud

# После завершения работы
git add .
git commit -m "feat: add CRUD operations for tasks"
git push origin feature/tasks-crud

# Создать Pull Request на GitHub → в develop
# После ревью и тестов → мердж

# Релиз
git checkout develop
git checkout -b release/v1.0
git push origin release/v1.0
# Тестирование на стейджинге

# Мердж в main
git checkout main
git merge release/v1.0
git tag v1.0
git push origin main --tags
```
### CI/CD (автоматический деплой при пуше в main):
``` yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: pip install -r requirements.txt
      - run: pytest tests/
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```
