# Этап 8. Реализация ключевой сущности (Задача)
## Тест-кейсы для проверки CRUD задач (СА)
| ID  | Название | Шаги | Ожидаемый результат |
| --- | --- | --- | --- |
| TC-01 | Создать задачу с заголовком | 1\. POST /tasks с title="Тест" | 201, задача создана, есть ID |
| TC-02 | Создать задачу без заголовка | 1\. POST /tasks с title="" | 400, ошибка "Title required" |
| TC-03 | Создать задачу с датой | 1\. POST /tasks с due_date="2026-12-31" | 201, дата сохранилась |
| TC-04 | Получить список задач | 1\. GET /tasks | 200, массив задач |
| TC-05 | Отметить задачу выполненной | 1\. PUT /tasks/1 {is_done: true} | 200, is_done = true |
| TC-06 | Редактировать заголовок | 1\. PUT /tasks/1 {title: "Новый"} | 200, заголовок изменён |
| TC-07 | Удалить задачу | 1\. DELETE /tasks/1 | 200, {message: "deleted"} |
| TC-08 | Удалить несуществующую | 1\. DELETE /tasks/999 | 404, "Task not found" |
| TC-09 | Чужая задача (другой пользователь) | 1\. GET /tasks чужого ID | 404 или 403 |
| TC-10 | Сортировка по дате | 1\. GET /tasks?sort=due_date | 200, задачи в правильном порядке |
---
## Анимации и состояния (UX)
### Состояния задачи:
1.	Обычное (normal)

    o	Белый фон, серая граница

    o	Чекбокс пустой (круг)

    o	Анимация при hover: плавное появление тени (0.2s ease)

2.	Выполненное (done)

    o	Чекбокс с галочкой (анимация: масштабирование от 0 до 1)

    o	Текст зачёркнут (линия появляется слева направо)

    o	Фон становится светло-серым

3.	Удаление (deleting)

    o	При клике на 🗑️ задача исчезает с анимацией:

        - Сжатие по горизонтали (width: 100% → 0)

        - Прозрачность (opacity: 1 → 0)

        - Длительность: 0.3s

4.	Создание (creating)

    o	Новая задача появляется сверху списка

    o	Анимация: "всплытие" (translateY(-20px) → 0, opacity: 0 → 1)

5.	Загрузка (loading)

    o	Скелетон (серые полоски с пульсацией)

    o	Длительность анимации: 1.5s бесконечно

### CSS для анимаций (пример):
``` css
.task {
    transition: all 0.2s ease;
}

.task:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.task.done .title {
    text-decoration: line-through;
}

.task.deleting {
    animation: slideOut 0.3s forwards;
}

@keyframes slideOut {
    to {
        transform: scaleX(0);
        opacity: 0;
        display: none;
    }
}

@keyframes fadeIn {
    from {
        transform: translateY(-20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
```
---
## CRUD для основной сущности (BE)
### Полный код tasks.py:
``` python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import date
import sqlite3

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    is_done: Optional[bool] = None

# Получить все задачи
@router.get("")
def get_tasks(user_id: int = Depends(get_current_user)):
    conn = sqlite3.connect("todo.db")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, title, description, due_date, is_done, created_at FROM tasks WHERE user_id = ?",
        (user_id,)
    )
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "due_date": row[3],
            "is_done": bool(row[4]),
            "created_at": row[5]
        }
        for row in rows
    ]

# Создать задачу
@router.post("", status_code=201)
def create_task(task: TaskCreate, user_id: int = Depends(get_current_user)):
    if not task.title or len(task.title.strip()) == 0:
        raise HTTPException(400, "Title is required")

    conn = sqlite3.connect("todo.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO tasks (title, description, due_date, user_id) VALUES (?, ?, ?, ?)",
        (task.title.strip(), task.description, task.due_date, user_id)
    )
    conn.commit()
    task_id = cursor.lastrowid
    conn.close()

    return {"id": task_id, "title": task.title, "is_done": False}

# Обновить задачу
@router.put("/{task_id}")
def update_task(task_id: int, task: TaskUpdate, user_id: int = Depends(get_current_user)):
    conn = sqlite3.connect("todo.db")
    cursor = conn.cursor()

    # Проверяем, что задача принадлежит пользователю
    cursor.execute("SELECT user_id FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(404, "Task not found")
    if row[0] != user_id:
        raise HTTPException(403, "Access denied")

    # Собираем динамический UPDATE
    updates = []
    params = []
    if task.title is not None:
        updates.append("title = ?")
        params.append(task.title.strip())
    if task.description is not None:
        updates.append("description = ?")
        params.append(task.description)
    if task.due_date is not None:
        updates.append("due_date = ?")
        params.append(task.due_date)
    if task.is_done is not None:
        updates.append("is_done = ?")
        params.append(1 if task.is_done else 0)

    if updates:
        query = f"UPDATE tasks SET {', '.join(updates)} WHERE id = ?"
        params.append(task_id)
        cursor.execute(query, params)
        conn.commit()

    conn.close()
    return {"message": "Task updated"}

# Удалить задачу
@router.delete("/{task_id}")
def delete_task(task_id: int, user_id: int = Depends(get_current_user)):
    conn = sqlite3.connect("todo.db")
    cursor = conn.cursor()

    cursor.execute("SELECT user_id FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(404, "Task not found")
    if row[0] != user_id:
        raise HTTPException(403, "Access denied")

    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()

    return {"message": "Task deleted"}
```
---
## Контроль версионности API (TL)
### Стратегия версионирования:
•	Версия в URL: /api/v1/tasks, /api/v2/tasks

•	Текущая: v1

•	Изменения, ломающие обратную совместимость → новая версия

 ### Пример маршрутизации:
 ``` python
 from fastapi import FastAPI

app = FastAPI()

from auth import router as auth_v1
from tasks import router as tasks_v1

app.include_router(auth_v1, prefix="/api/v1")
app.include_router(tasks_v1, prefix="/api/v1")
```
