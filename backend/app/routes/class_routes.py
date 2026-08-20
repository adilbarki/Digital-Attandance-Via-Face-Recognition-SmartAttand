from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime
from app.models.class_model import ClassModel
from app.utils.db import get_database
from app.routes.auth import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/classes", tags=["Classes"])

# Add Class (Teacher only)
@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_class(class_data: ClassModel, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admin can create classes")
    
    db = get_database()
    
    class_dict = {
        "class_name": class_data.class_name,
        "section": class_data.section,
        "subject": class_data.subject,
        "teacher_id": str(current_user["_id"]),
        "created_at": datetime.now()
    }
    
    result = await db.classes.insert_one(class_dict)
    
    return {
        "id": str(result.inserted_id),
        "class_name": class_data.class_name,
        "section": class_data.section,
        "subject": class_data.subject,
        "teacher_id": str(current_user["_id"]),
        "created_at": datetime.now()
    }

# Get classes - Admin sees all, Teacher sees only theirs
@router.get("")
@router.get("/")
async def get_teacher_classes(current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    # If admin, return all classes
    if current_user["role"] == "admin":
        classes_cursor = db.classes.find()
    else:
        classes_cursor = db.classes.find({"teacher_id": str(current_user["_id"])})
    
    classes = await classes_cursor.to_list(None)
    
    result = []
    for c in classes:
        result.append({
            "id": str(c["_id"]),
            "class_name": c["class_name"],
            "section": c["section"],
            "subject": c["subject"],
            "teacher_id": c["teacher_id"],
            "created_at": str(c["created_at"]) if c.get("created_at") else None
        })
    
    return result

# Get all classes for admin (explicit endpoint)
@router.get("/all")
async def get_all_classes(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    classes = await db.classes.find().to_list(None)
    
    result = []
    for c in classes:
        result.append({
            "id": str(c["_id"]),
            "class_name": c["class_name"],
            "section": c["section"],
            "subject": c["subject"],
            "teacher_id": c["teacher_id"],
            "created_at": str(c["created_at"]) if c.get("created_at") else None
        })
    return result

# Delete class by ID
@router.delete("/{class_id}")
async def delete_class(class_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers or admin can delete classes")
    
    db = get_database()
    
    try:
        students = await db.students.find({"class_id": class_id}).to_list(None)
        
        for student in students:
            if student.get("user_id"):
                await db.users.delete_one({"_id": ObjectId(student["user_id"])})
        
        await db.students.delete_many({"class_id": class_id})
        
        result = await db.classes.delete_one({"_id": ObjectId(class_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Class not found")
        
        return {"message": "Class and all students deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting class: {str(e)}")

# Update class
@router.put("/{class_id}")
async def update_class(class_id: str, class_data: ClassModel, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers or admin can update classes")
    
    db = get_database()
    
    try:
        update_data = {
            "class_name": class_data.class_name,
            "section": class_data.section,
            "subject": class_data.subject,
            "updated_at": datetime.now()
        }
        
        result = await db.classes.update_one(
            {"_id": ObjectId(class_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Class not found")
        
        return {"message": "Class updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating class: {str(e)}")

# Get single class by ID
@router.get("/{class_id}")
async def get_class(class_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    try:
        class_obj = await db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_obj:
            raise HTTPException(status_code=404, detail="Class not found")
        
        return {
            "id": str(class_obj["_id"]),
            "class_name": class_obj["class_name"],
            "section": class_obj["section"],
            "subject": class_obj["subject"],
            "teacher_id": class_obj["teacher_id"],
            "created_at": str(class_obj["created_at"]) if class_obj.get("created_at") else None
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid class ID")