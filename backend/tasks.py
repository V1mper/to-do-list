from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from sqlalchemy.orm import Session
from database import get_db
from models import Task, User
from auth import get_current_user

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    is_done: Optional[bool] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    is_done: bool
    created_at: datetime
    is_overdue: bool = False

@router.get("", response_model=List[TaskResponse])
def get_tasks(
    filter: str = Query("all", regex="^(all|active|done)$"),
    search: Optional[str] = None,
    sort: str = Query("due_date", regex="^(due_date|created_at|title)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Task).filter(Task.user_id == current_user.id)

    if filter == "active":
        query = query.filter(Task.is_done == False)
    elif filter == "done":
        query = query.filter(Task.is_done == True)

    if search and len(search) >= 2:
        query = query.filter(Task.title.contains(search))

    if sort == "due_date":
        query = query.order_by(Task.due_date.asc().nullslast())
    elif sort == "created_at":
        query = query.order_by(Task.created_at.desc())
    elif sort == "title":
        query = query.order_by(Task.title.asc())

    tasks = query.all()
    today = date.today()

    return [
        TaskResponse(
            id=t.id,
            title=t.title,
            description=t.description,
            due_date=t.due_date,
            is_done=t.is_done,
            created_at=t.created_at,
            is_overdue=t.due_date and t.due_date < today and not t.is_done
        )
        for t in tasks
    ]

@router.post("", status_code=201)
def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not task.title or len(task.title.strip()) == 0:
        raise HTTPException(400, "Title is required")

    db_task = Task(
        title=task.title.strip(),
        description=task.description,
        due_date=task.due_date,
        user_id=current_user.id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    return {"id": db_task.id, "title": db_task.title, "is_done": db_task.is_done}

@router.put("/{task_id}")
def update_task(
    task_id: int,
    task: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(404, "Task not found")
    if db_task.user_id != current_user.id:
        raise HTTPException(403, "Access denied")

    if task.title is not None:
        db_task.title = task.title.strip()
    if task.description is not None:
        db_task.description = task.description
    if task.due_date is not None:
        db_task.due_date = task.due_date
    if task.is_done is not None:
        db_task.is_done = task.is_done

    db.commit()
    return {"message": "Task updated"}

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(404, "Task not found")
    if db_task.user_id != current_user.id:
        raise HTTPException(403, "Access denied")

    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted"}

@router.get("/stats")
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total = db.query(Task).filter(Task.user_id == current_user.id).count()
    done = db.query(Task).filter(Task.user_id == current_user.id, Task.is_done == True).count()
    percent = round(done / total * 100) if total > 0 else 0

    return {"total": total, "done": done, "active": total - done, "percent": percent}
