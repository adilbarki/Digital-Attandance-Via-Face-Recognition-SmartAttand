from fastapi import APIRouter, HTTPException, Depends
from app.utils.db import get_database
from app.routes.auth import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("/users")
async def search_users(
    query: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    
    results = []
    
    # ✅ Search students by roll_number directly
    students = await db.students.find({
        "$or": [
            {"roll_number": {"$regex": query, "$options": "i"}},
            {"name": {"$regex": query, "$options": "i"}},
            {"email": {"$regex": query, "$options": "i"}}
        ]
    }).to_list(None)
    
    for student in students:
        # Get class and section
        class_name = "Not Assigned"
        section = ""
        if student.get("class_id"):
            class_info = await db.classes.find_one({"_id": ObjectId(student["class_id"])})
            if class_info:
                class_name = class_info.get("class_name", "Not Assigned")
                section = class_info.get("section", "")
        
        results.append({
            "id": str(student["_id"]),
            "name": student.get("name", ""),
            "roll_number": student.get("roll_number", ""),
            "email": student.get("email", ""),
            "class": class_name,
            "section": section,
            "role": "student"
        })
    
    # ✅ Search teachers
    teachers = await db.users.find({
        "role": "teacher",
        "$or": [
            {"full_name": {"$regex": query, "$options": "i"}},
            {"email": {"$regex": query, "$options": "i"}},
            {"teacher_id": {"$regex": query, "$options": "i"}}
        ]
    }).to_list(None)
    
    for teacher in teachers:
        results.append({
            "id": str(teacher["_id"]),
            "name": teacher.get("full_name", teacher.get("username")),
            "email": teacher.get("email"),
            "teacher_id": teacher.get("teacher_id", ""),
            "role": "teacher"
        })
    
    return results