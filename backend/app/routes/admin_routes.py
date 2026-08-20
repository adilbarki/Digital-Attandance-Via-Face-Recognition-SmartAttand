from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime
from app.utils.db import get_database
from app.routes.auth import get_current_user
from app.utils.auth import hash_password
from bson import ObjectId
from typing import Optional, List
import cloudinary.uploader




router = APIRouter(prefix="/admin", tags=["Admin"])

# Get all admins (only super admin can see other admins)
@router.get("/admins")
async def get_all_admins(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    admins = await db.users.find({"role": "admin"}).to_list(None)
    
    result = []
    for a in admins:
        result.append({
            "id": str(a["_id"]),
            "full_name": a.get("full_name", "N/A"),
            "username": a.get("username", "N/A"),
            "email": a.get("email", "N/A"),
            "created_at": a.get("created_at")
        })
    return result

@router.get("/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    users = await db.users.find({
        "role": {"$in": ["admin", "teacher", "student"]}
    }).to_list(None)
    
    result = []
    for u in users:
        class_name = None
        student_doc_id = None

        if u.get("role") == "student":
            student = None

            # 1. users._id se find karo
            student = await db.students.find_one({"user_id": str(u["_id"])})

            # 2. users.email se find karo
            if not student and u.get("email"):
                student = await db.students.find_one({"email": u["email"]})

            # 3. users.username se find karo (roll_number)
            if not student and u.get("username"):
                student = await db.students.find_one({"roll_number": u["username"]})

            if student:
                student_doc_id = str(student["_id"])
                if student.get("class_id"):
                    try:
                        class_info = await db.classes.find_one(
                            {"_id": ObjectId(student["class_id"])}
                        )
                        if class_info:
                            class_name = class_info.get("class_name")
                    except:
                        pass

        result.append({
            "id": str(u["_id"]),
            "user_id": str(u["_id"]),
            "student_id": student_doc_id,
            "username": u.get("username"),
            "email": u.get("email"),
            "role": u.get("role"),
            "full_name": u.get("full_name"),
            "is_active": u.get("is_active", True),
            "class_name": class_name,
            "created_at": u.get("created_at")
        })
    
    return result


# Get all teachers (admin sees only their own teachers)
@router.get("/teachers")
async def get_all_teachers(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    # Get teachers created by this admin
    teachers = await db.users.find({
        "role": "teacher",
        "created_by": str(current_user["_id"])
    }).to_list(None)
    
    result = []
    for t in teachers:
        classes = await db.classes.find({"teacher_id": str(t["_id"])}).to_list(None)
        result.append({
            "id": str(t["_id"]),
            "full_name": t.get("full_name", "N/A"),
            "username": t.get("username", "N/A"),
            "email": t.get("email", "N/A"),
            "classes": [{"id": str(c["_id"]), "name": c["class_name"], "section": c["section"]} for c in classes],
            "created_at": t.get("created_at")
        })
    return result

# Get all students (admin sees only their own students)
@router.get("/students")
async def get_all_students(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    # Get students created by this admin
    # students = await db.students.find({
    #     "created_by": str(current_user["_id"])
    # }).to_list(None)

    students = await db.students.find().to_list(None)
    
    result = []
    for s in students:
        class_info = None
        if s.get("class_id"):
            try:
                class_info = await db.classes.find_one({"_id": ObjectId(s["class_id"])})
            except:
                pass
        
        result.append({
           "id": str(s["_id"]),
           "user_id": s.get("user_id", ""),
            "name": s.get("name", "N/A"),
            "roll_number": s.get("roll_number", "N/A"),
            "email": s.get("email", "N/A"),
            "mobile_number": s.get("mobile_number", "N/A"),
            "class_name": class_info.get("class_name", "Not Assigned") if class_info else "Not Assigned",
            "class_id": s.get("class_id", ""),
            "photo_url": s.get("photo_url", ""),
            "created_by": s.get("created_by", "")

        })
    return result

# Get all classes (admin sees only their own classes)
@router.get("/classes")
async def get_all_classes(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    # Get classes created by this admin's teachers
    teachers = await db.users.find({"role": "teacher", "created_by": str(current_user["_id"])}).to_list(None)
    teacher_ids = [str(t["_id"]) for t in teachers]
    
    classes = await db.classes.find({"teacher_id": {"$in": teacher_ids}}).to_list(None)
    
    result = []
    for c in classes:
        teacher = await db.users.find_one({"_id": ObjectId(c["teacher_id"])})
        result.append({
            "id": str(c["_id"]),
            "class_name": c.get("class_name", "N/A"),
            "section": c.get("section", "N/A"),
            "subject": c.get("subject", "N/A"),
            "teacher_id": c.get("teacher_id", ""),
            "teacher_name": teacher.get("full_name", "Not Assigned") if teacher else "Not Assigned",
            "created_at": c.get("created_at")
        })
    return result

# Get dashboard stats
@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    total_users = await db.users.count_documents({})
    total_teachers = await db.users.count_documents({"role": "teacher", "created_by": str(current_user["_id"])})
    # total_students = await db.students.count_documents({"created_by": str(current_user["_id"])})
    total_students = await db.students.count_documents({})  
    total_classes = await db.classes.count_documents({})
    
    return {
        "total_users": total_users,
        "total_teachers": total_teachers,
        "total_students": total_students,
        "total_classes": total_classes
    }

# Add teacher
@router.post("/teachers", status_code=status.HTTP_201_CREATED)
async def add_teacher(
    teacher_data: dict,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    # Check if email already exists
    existing = await db.users.find_one({"email": teacher_data["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    teacher_dict = {
        "username": teacher_data["username"],
        "email": teacher_data["email"],
        "password": hash_password(teacher_data["password"]),
        "role": "teacher",
        "full_name": teacher_data["full_name"],
        "created_by": str(current_user["_id"]),
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    result = await db.users.insert_one(teacher_dict)
    
    return {
        "id": str(result.inserted_id),
        "message": "Teacher added successfully",
        "default_password": teacher_data["password"]
    }

# Move multiple students to another class
@router.post("/students/move-bulk")
async def move_multiple_students(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    student_ids = request.get("student_ids", [])
    new_class_id = request.get("new_class_id", "")
    
    if not student_ids:
        raise HTTPException(status_code=400, detail="No students selected")
    
    if not new_class_id:
        raise HTTPException(status_code=400, detail="No class selected")
    
    db = get_database()
    
    new_class = await db.classes.find_one({"_id": ObjectId(new_class_id)})
    if not new_class:
        raise HTTPException(status_code=404, detail="Class not found")
    
    moved_count = 0
    for student_id in student_ids:
    # ✅ students._id se dhundho
        student = await db.students.find_one({"_id": ObjectId(student_id)})
    
    # ✅ Nahi mila to user_id se dhundho
    if not student:
        student = await db.students.find_one({"user_id": student_id})
    
    # ✅ Phir bhi nahi mila to users collection se
    if not student:
        try:
            user = await db.users.find_one({"_id": ObjectId(student_id)})
            if user:
                student = await db.students.find_one({"email": user.get("email")})
            if not student and user:
                student = await db.students.find_one({"roll_number": user.get("username")})
        except:
            pass
    
    if student:
            result = await db.students.update_one(
                {"_id": ObjectId(student_id)},
                {"$set": {"class_id": new_class_id, "updated_at": datetime.now()}}
            )
            if result.modified_count > 0:
                moved_count += 1
                
                # ✅ Update user's class_id
                if student.get("user_id"):
                    await db.users.update_one(
                        {"_id": ObjectId(student["user_id"])},
                        {"$set": {"class_id": new_class_id}}
                    )
    
    return {
        "message": f"{moved_count} students moved to {new_class['class_name']}",
        "moved_count": moved_count
    }

# Manually mark attendance
@router.post("/attendance/manual")
async def manual_mark_attendance(
    student_id: str,
    class_id: str,
    date: str = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    current_time = datetime.now().strftime("%H:%M:%S")
    
    # Get student info
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get class info
    class_info = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_info:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Check if already marked
    existing = await db.attendance.find_one({
        "student_id": student_id,
        "class_id": class_id,
        "date": date
    })
    
    if existing:
        return {"message": "Attendance already marked for today", "already_marked": True}
    
    # Mark attendance
    attendance_record = {
        "student_id": student_id,
        "student_name": student.get("name"),
        "roll_number": student.get("roll_number"),
        "class_id": class_id,
        "class_name": class_info.get("class_name"),
        "date": date,
        "time": current_time,
        "status": "present",
        "confidence": 1.0,
        "marked_by": str(current_user["_id"]),
        "marked_by_name": current_user.get("full_name"),
        "manual_mark": True,
        "created_at": datetime.now()
    }
    
    await db.attendance.insert_one(attendance_record)
    
    return {"message": f"Attendance marked for {student.get('name')}", "success": True}

# Get class attendance records
@router.get("/attendance/class/{class_id}")
async def get_class_attendance_records(
    class_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    # Get class info
    class_info = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_info:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Get all students in this class
    students = await db.students.find({"class_id": class_id}).to_list(None)
    
    # Get attendance records
    attendance = await db.attendance.find({"class_id": class_id}).to_list(None)
    
    # Group by date
    records_by_date = {}
    for a in attendance:
        date = a.get("date")
        if date not in records_by_date:
            records_by_date[date] = []
        records_by_date[date].append({
            "student_name": a.get("student_name"),
            "roll_number": a.get("roll_number"),
            "time": a.get("time"),
            "confidence": a.get("confidence")
        })
    
    return {
        "class_name": class_info.get("class_name"),
        "section": class_info.get("section"),
        "subject": class_info.get("subject"),
        "total_students": len(students),
        "attendance_records": records_by_date
    }

@router.get("/attendance/class/{class_id}/today")
async def get_class_attendance_today(
    class_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    # Get class info
    class_info = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_info:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Get all students in this class
    students_list = await db.students.find({"class_id": class_id}).to_list(None)
    
    # Get today's date
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Get today's attendance records
    attendance_records = await db.attendance.find({
        "class_id": class_id,
        "date": today
    }).to_list(None)
    
    # Create attendance map
    attendance_map = {}
    for record in attendance_records:
        student_id = record.get("student_id")
        if student_id:
            attendance_map[student_id] = record
    
    # Prepare response
    students_with_attendance = []
    present_count = 0
    
    for student in students_list:
        student_id = str(student["_id"])
        if student_id in attendance_map:
            present_count += 1
            students_with_attendance.append({
                "student_id": student_id,
                "student_name": student.get("name"),
                "roll_number": student.get("roll_number"),
                "status": "present",
                "time": attendance_map[student_id].get("time", "-")
            })
        else:
            students_with_attendance.append({
                "student_id": student_id,
                "student_name": student.get("name"),
                "roll_number": student.get("roll_number"),
                "status": "absent",
                "time": "-"
            })
    
    return {
        "class_name": class_info.get("class_name"),
        "section": class_info.get("section"),
        "subject": class_info.get("subject"),
        "date": today,
        "total_students": len(students_list),
        "present_count": present_count,
        "absent_count": len(students_list) - present_count,
        "students": students_with_attendance
    }

# Update user (teacher/student/admin)
@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: dict,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    update_fields = {}
    allowed_fields = ["full_name", "email", "username"]
    
    for field in allowed_fields:
        if field in user_data:
            update_fields[field] = user_data[field]
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_fields["updated_at"] = datetime.now()
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated successfully"}

# Delete user
@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["role"] == "student":
        await db.students.delete_many({"user_id": user_id})
    
    await db.users.delete_one({"_id": ObjectId(user_id)})
    
    return {"message": f"{user['role']} deleted successfully"}

# Delete class
@router.delete("/classes/{class_id}")
async def delete_class(class_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    await db.classes.delete_one({"_id": ObjectId(class_id)})
    await db.students.delete_many({"class_id": class_id})
    await db.attendance.delete_many({"class_id": class_id})
    
    return {"message": "Class deleted successfully"}