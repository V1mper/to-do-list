**Этап 2 – Анализ требований и первый User Story Mapping**

**Цель этапа:** разбить проект на функциональные модули, сформулировать пользовательские истории, построить карту пользовательских сценариев, найти визуальные ориентиры, заложить структуру данных и создать бэклог для планирования разработки.

---

### 1. Системный аналитик (Бондаренко) – User Stories и Use Case диаграмма

#### 1.1. Подробные пользовательские истории с критериями приёмки

Все истории приоритизированы методом **MoSCoW**:

- **Must have** — без этого продукт не работает.
- **Should have** — важные, но не критические для первого релиза.
- **Could have** — желательные, можно отложить.

| ID     | Что хочет пользователь                                                                 | Приоритет   | Критерии приёмки |
|--------|----------------------------------------------------------------------------------------|-------------|------------------|
| US-01  | Как новый пользователь, я хочу зарегистрироваться по email и паролю, чтобы иметь личный аккаунт | **Must**    | 1. Ввод email + пароль (мин. 6 символов)<br>2. При успехе — 201<br>3. При занятом email — 409<br>4. Пароль хешируется |
| US-02  | Как зарегистрированный пользователь, я хочу войти в систему, чтобы получить доступ к своим задачам | **Must**    | 1. Email + пароль<br>2. Возврат JWT-токена<br>3. 401 при неверных данных<br>4. Токен 24 часа |
| US-03  | Как авторизованный пользователь, я хочу создать задачу с названием, описанием, сроком и приоритетом | **Must**    | title (обяз.), description, due_date, priority (low/medium/high) |
| US-04  | Как пользователь, я хочу видеть список своих задач, чтобы оценить текущую нагрузку     | **Must**    | Фильтрация и сортировка по умолчанию (новые сверху) |
| US-05  | Как пользователь, я хочу редактировать задачу, чтобы уточнить детали                   | **Must**    | PUT/PATCH, запрет редактирования чужих задач (403) |
| US-06  | Как пользователь, я хочу отметить задачу выполненной (чекбокс)                        | **Must**    | Переключение active ↔ completed |
| US-07  | Как пользователь, я хочу удалить задачу, если она больше не актуальна                 | **Should**  | DELETE только своей задачи |
| US-08  | Как пользователь, я хочу создавать проекты (категории), чтобы группировать задачи     | **Should**  | project_id в задаче (опционально) |
| US-09  | Как пользователь, я хочу фильтровать задачи по проекту, статусу и приоритету          | **Should**  | Комбинированные query-параметры |
| US-10  | Как пользователь, я хочу получать напоминание о приближающемся сроке задачи           | **Could**   | Только поле due_date (реализация в следующих версиях) |

---

### 2. UI/UX Дизайнер (Провоторова) – Референсы и первый набросок интерфейса

#### 2.1. Анализ конкурентов и референсов

| Сервис            | Ключевые UI-решения                                      | Что берём в проект |
|-------------------|----------------------------------------------------------|--------------------|
| **Todoist**       | Быстрое добавление через «+», цветные метки, сайдбар    | Строка быстрого добавления, цветные индикаторы приоритета |
| **Microsoft To Do** | Минимализм, «Мой день», плавное зачёркивание           | Светлая тема, анимация чекбокса |
| **Trello**        | Карточки, drag-and-drop                                  | Цветовые метки проектов (канбан — не в MVP) |
| **Notion**        | Гибкие представления                                     | Только список в MVP |

---

# 🗄️ 3. Backend-разработчик (Плеханов) — Структура БД и техническая реализуемость

### 3.1. Детальный набросок сущностей БД

| Параметр     | Значение                          |
|--------------|-----------------------------------|
| **СУБД**     | PostgreSQL                        |
| **ORM**      | SQLAlchemy 2.0 (асинхронный)      |
| **Миграции** | Alembic                           |

#### Файл `app/models.py`

```python
import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

class PriorityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"

class TaskStatus(str, enum.Enum):
    active = "active"
    completed = "completed"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="owner")
    tasks = relationship("Task", back_populates="owner")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    priority = Column(Enum(PriorityEnum), default=PriorityEnum.medium, nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.active, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="tasks")
    owner = relationship("User", back_populates="tasks")
```
   ### Индексы

| Таблица | Поле        | Тип индекса      |
|---------|-------------|------------------|
| users   | email       | **UNIQUE INDEX** |
| tasks   | user_id     | INDEX            |
| tasks   | project_id  | INDEX            |
| tasks   | status      | INDEX            |
| tasks   | priority    | INDEX            |

---

### Схема связей между таблицами

```text
┌──────────┐        ┌──────────────┐        ┌──────────┐
│   User   │ 1 ─── * │   Project    │        │   Task   │
│          │         │              │ 1 ─── * │          │
│          │ 1 ─── * └──────────────┘        │          │
└──────────┘                                 └──────────┘
```
### Схема связей между таблицами

| Связь                | Тип связи   | Поведение при удалении |
|----------------------|-------------|------------------------|
| User → Project       | 1 ко многим | **CASCADE**            |
| User → Task          | 1 ко многим | **CASCADE**            |
| Project → Task       | 1 ко многим | **SET NULL**           |

---

### 3.2. Техническая реализуемость за семестр

| Критерий                  | Оценка                                      |
|---------------------------|---------------------------------------------|
| Объём работ               | ~15–20 часов backend-разработки             |
| Основные операции         | CRUD задач и проектов, JWT-аутентификация   |
| Технологии                | FastAPI + SQLAlchemy + PostgreSQL           |
| Тестирование              | Pytest (входит в оценку)                    |
| Что **НЕ** входит в MVP   | Почтовые уведомления, WebSocket, real-time обновления |

---

### Технологический стек

| Компонент            | Технология                          |
|----------------------|-------------------------------------|
| Язык                 | Python 3.11                         |
| Веб-фреймворк        | **FastAPI**                         |
| ORM                  | **SQLAlchemy 2.0** (async)          |
| База данных          | **PostgreSQL**                      |
| Миграции             | **Alembic**                         |
| Аутентификация       | PyJWT + passlib[bcrypt]             |
| Валидация            | **Pydantic**                        |
| Тестирование         | Pytest + httpx                      |

---

### 4. Team Lead / DevOps (Болдырев) — Бэклог задач и User Story Mapping

#### 4.1. User Story Mapping

**🧭 Основные шаги пользователя:**

- **Шаг 1:** Регистрация / Вход
- **Шаг 2:** Просмотр задач
- **Шаг 3:** Управление задачами
- **Шаг 4:** Управление проектами
- **Шаг 5:** Будущие версии (НЕ в MVP)

#### 4.2. Бэклог задач (Sprint 1)

**Инструмент:** Trello / Jira / Notion
**Ссылка на доску:** [вставить ссылку]

**Колонки доски:**

- **Backlog**
- **Sprint Backlog (To Do)**
- **In Progress**
- **Review**
- **Done** ✅

**Эпики:**

- Эпик 1: Инициализация проекта
- Эпик 2: Аутентификация
- Эпик 3: CRUD задач
- Эпик 4: Проекты
- Эпик 5: API документация
- Эпик 6: CI/CD

---

### Сводка по трудозатратам

| Приоритет | Суммарная оценка |
|-----------|------------------|
| Must      | 28 часов         |
| Should    | 11 часов         |
| **Итого** | **~39 часов**    |
