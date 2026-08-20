from fastapi import HTTPException, Depends
from app.routes.auth import get_current_user

async def require_teacher(current_user: dict = Depends(get_current_user)):
    """Only teachers can access"""
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return current_user

async def require_student(current_user: dict = Depends(get_current_user)):
    """Only students can access"""
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user

async def require_teacher_or_self_student(
    current_user: dict = Depends(get_current_user),
    student_id: str = None
):
    """Teachers can access any, students only their own data"""
    if current_user["role"] == "teacher":
        return current_user
    
    if current_user["role"] == "student":
        # Check if student is accessing their own data
        if current_user.get("student_id") == student_id or str(current_user["_id"]) == student_id:
            return current_user
    
    raise HTTPException(status_code=403, detail="Access denied")