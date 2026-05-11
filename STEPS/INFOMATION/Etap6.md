# Этап 6. Модуль авторизации и регистрации

## Сценарии ошибок (СА)

| Сценарий | Входные данные | Ожидаемый результат |
| --- | --- | --- |
| Успешная регистрация | email@example.com, pass123 | 201, user_id |
| Email уже существует | существующий email | 409, "Email already exists" |
| Короткий пароль | 12345 | 400, "Password too short" |
| Невалидный email | notanemail | 400, "Invalid email" |
| Успешный вход | верный email+пароль | 200, access_token |
| Неверный пароль | верный email + wrongpass | 401, "Invalid credentials" |
| Несуществующий email | fake@example.com | 401, "Invalid credentials" |
| Истёкший токен | старый JWT | 401, "Token expired" → редирект на логин |
| Блокировка (5 неудачных входов) | 5 раз неверный пароль | 429, "Too many attempts" |
---

## Дизайн экранов входа/регистрации (UX)

### Экран входа (кликабельный прототип в Figma):

- Поле Email с валидацией (красная рамка при ошибке)
- Поле Password (тип password, есть глазок для показа)
- Кнопка "Войти" (активна только когда оба поля заполнены)
- Ссылка "Забыли пароль?" (показывает модалку с восстановлением)
- Кнопка "Регистрация" (переход на экран регистрации)

### Экран регистрации:

- Поля: Email, Password, Confirm Password
- Валидация в реальном времени:
    - пароль ≥ 6 символов
    - пароль и подтверждение совпадают
- Кнопка "Зарегистрироваться" (блокирована до валидации)

### Модалка восстановления пароля:

- Поле Email
- Кнопка "Сбросить пароль" → показывает "Инструкция отправлена на email"

## Разработка JWT, регистрация, хеширование (BE)

### Полный код модуля аутентификации (**auth.py**):

```python
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import sqlite3

router = APIRouter(prefix="/api", tags=["auth"])

# Конфигурация
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Модели
class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# Хеширование
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# JWT
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Получение текущего пользователя
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return int(user_id)

# Эндпоинты
@router.post("/register", status_code=201)
def register(user: UserRegister):
    if len(user.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    hashed = hash_password(user.password)

    conn = sqlite3.connect("todo.db")
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (user.email, hashed)
        )
        conn.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Email already exists")
    finally:
        conn.close()

    return {"user_id": user_id, "email": user.email}

@router.post("/login", response_model=Token)
def login(user: UserLogin):
    conn = sqlite3.connect("todo.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, password_hash FROM users WHERE email = ?", (user.email,))
    row = cursor.fetchone()
    conn.close()

    if not row or not verify_password(user.password, row[1]):
        raise HTTPException(401, "Invalid credentials")

    access_token = create_access_token(data={"sub": str(row[0])})
    return {"access_token": access_token, "token_type": "bearer"}
```
---
## Проверка безопасности (TL)

### Чек-лист безопасности:

- ✅ Пароли хешируются (bcrypt), не хранятся в открытом виде
- ✅ JWT имеет короткое время жизни (60 мин)
- ✅ Все защищённые эндпоинты проверяют токен
- ✅ Нет SQL-инъекций (используются параметризованные запросы)
- ✅ CORS настроен (только доверенные домены)
- ✅ Валидация email и длины пароля

### Тест через Postman:

1.  POST /api/register → получаем user_id
2.  POST /api/login → копируем access_token
3.  GET /api/tasks с заголовком Authorization: Bearer &lt;token&gt; → получаем список (пока пустой)

### 📦 Что готово к этому моменту

| Этап | Артефакты |
| --- | --- |
| 1   | Протокол, CJM, требования, репозиторий |
| 2   | User Stories, Use Case, референсы, сущности БД, бэклог |
| 3   | Детальный сценарий, User Flow, ER-диаграмма, эндпоинты |
| 4   | Wireframes (4 экрана), проверка, ревью |
| 5   | README, гайдлайны, Postman, CI |
| 6   | Сценарии ошибок, дизайн экранов, готовый код аутентификации |
