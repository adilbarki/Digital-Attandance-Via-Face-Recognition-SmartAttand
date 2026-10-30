from fastapi import APIRouter, Form, HTTPException, Depends, status, UploadFile, File
from datetime import datetime
from app.utils.db import get_database
from app.routes.auth import get_current_user
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional, List
import numpy as np
import cv2
import face_recognition
import pickle
import os

router = APIRouter(prefix="/attendance", tags=["Attendance"])

# Load face encodings at startup
KNOWN_ENCODINGS = []
KNOWN_NAMES = []
MODEL_PATH = "face_data/encodings/face_recognition_model.pkl"

if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, 'rb') as f:
            data = pickle.load(f)
            KNOWN_ENCODINGS = data['encodings']
            KNOWN_NAMES = data['names']
        print(f"✅ Loaded {len(KNOWN_NAMES)} face encodings for API")
    except Exception as e:
        print(f"⚠️ Could not load face encodings: {e}")
else:
    print(f"⚠️ Model not found at {MODEL_PATH}")

class MarkAttendanceRequest(BaseModel):
    student_name: str
    confidence: float

class AttendanceRecord(BaseModel):
    id: str
    student_name: str
    roll_number: str
    class_name: str
    date: str
    time: str
    confidence: float

# Create unique index on startup
async def create_unique_index():
    db = get_database()
    try:
        await db.attendance.create_index([("student_name", 1), ("date", 1)], unique=True)
        print("✅ Unique index on attendance (student_name, date) verified")
    except Exception as e:
        print(f"⚠️ Index creation: {e}")

@router.post("/mark", status_code=status.HTTP_201_CREATED)
async def mark_attendance(
    request: MarkAttendanceRequest,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    
    today = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().strftime("%H:%M:%S")
    
    student = await db.students.find_one({"name": request.student_name})
    if not student:
        raise HTTPException(status_code=404, detail=f"Student '{request.student_name}' not found")
    
    # STRONG DUPLICATE CHECK
    existing = await db.attendance.find_one({
        "student_name": request.student_name,
        "date": today
    })
    
    if existing:
        return {
            "success": False,
            "message": f"{request.student_name} already marked today at {existing.get('time', 'unknown')}",
            "already_marked": True
        }
    
    student_id = str(student["_id"])
    class_id = student.get("class_id")
    # Fetch class info if available
    if class_id:
        try:
            class_info = await db.classes.find_one({"_id": ObjectId(class_id)}) or {}
        except Exception:
            class_info = {}
    else:
        class_info = {}
    attendance_record = {
            "student_name": request.student_name,
            "student_id": student_id,
            "roll_number": student.get("roll_number", ""),  # ✅ ADDED
            "class_id": class_id,
            "class_name": class_info.get("class_name", ""),
            "course_name": class_info.get("subject", ""),
            "teacher_id": str(current_user["_id"]),
            "date": today,
            "time": current_time,
            "confidence": request.confidence,
            "marked_by": str(current_user["_id"]),
            "status": "present"
       }
    
    try:
        result = await db.attendance.insert_one(attendance_record)
        return {
            "success": True,
            "message": f"{request.student_name} marked present",
            "id": str(result.inserted_id),
            "time": current_time,
            "confidence": request.confidence
        }
    except Exception as e:
        # Duplicate error from database
        return {
            "success": False,
            "message": f"{request.student_name} already marked today",
            "already_marked": True
        }

@router.post("/recognize")
async def recognize_face(
    file: UploadFile = File(...),
    class_id: str = Form(...),  
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    
    # Get class info
    db = get_database()
    class_info = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_info:
        return {"recognized": False, "message": "Class not found"}

    if not KNOWN_ENCODINGS:
        return {"recognized": False, "message": "Face recognition model not loaded"}
    
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"recognized": False, "message": "Invalid image"}
    
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb_img)
    face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
    
    if not face_encodings:
        return {"recognized": False, "message": "No face detected"}
    
    db = get_database()
    today = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().strftime("%H:%M:%S")
    
    for face_encoding in face_encodings:
        distances = face_recognition.face_distance(KNOWN_ENCODINGS, face_encoding)
        best_match_index = np.argmin(distances)
        
        if distances[best_match_index] < 0.45:
            name = KNOWN_NAMES[best_match_index]
            confidence = 1 - distances[best_match_index]
            
            # Get student for roll_number
            student = await db.students.find_one({"name": name})
            
            # STRONG DUPLICATE CHECK before inserting
            existing = await db.attendance.find_one({
                "student_name": name,
                "class_id": class_id,  
                "date": today
            })
            
            if existing:
                return {
                    "recognized": True,
                    "name": name,
                    "confidence": confidence,
                    "already_marked": True,
                    "message": f"ℹ️ {name} already marked today at {existing.get('time', 'unknown')}"
                }
            
            # Insert new attendance with roll_number
            try:
                await db.attendance.insert_one({
                    "student_name": name,
                    "student_id": str(student["_id"]) if student else "",
                    "roll_number": student.get("roll_number", "") if student else "",  # ✅ ADDED
                    "class_id": class_id,
                    "class_name": class_info.get("class_name", ""),
                    "course_name": class_info.get("subject", ""),
                    "date": today,
                    "time": current_time,
                    "confidence": confidence,
                    "marked_by": str(current_user["_id"]),
                    "created_at": datetime.now()
                })
                
                return {
                    "recognized": True,
                    "name": name,
                    "confidence": confidence,
                    "time": current_time,
                    "message": f"✅ {name} marked present"
                }
            except Exception as e:
                return {
                    "recognized": True,
                    "name": name,
                    "already_marked": True,
                    "message": f"ℹ️ {name} already marked today (database constraint)"
                }
    
    return {"recognized": False, "message": "Face not recognized"}

@router.get("/today", response_model=List[AttendanceRecord])
async def get_today_attendance(current_user: dict = Depends(get_current_user)):
    db = get_database()
    today = datetime.now().strftime("%Y-%m-%d")
    
    attendance = await db.attendance.find({"date": today}).to_list(None)
    
    # Remove duplicates from response (just in case)
    seen = set()
    unique_attendance = []
    for a in attendance:
        key = f"{a.get('student_name', '')}_{a.get('date', '')}"
        if key not in seen:
            seen.add(key)
            unique_attendance.append(a)
    
    result = []
    for a in unique_attendance:
        result.append({
            "id": str(a["_id"]),
            "student_name": a["student_name"],
            "roll_number": a.get("roll_number", ""),  
            "class_name": a.get("class_name", ""),    
            "date": a["date"],
            "time": a["time"],
            "confidence": a.get("confidence", 0)
        })
    
    return result


@router.get("/my")
async def get_my_attendance(current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    student = await db.students.find_one({"user_id": str(current_user["_id"])})
    if not student:
        student = await db.students.find_one({"email": current_user["email"]})
    if not student:
        student = await db.students.find_one({"username": current_user["username"]})
    if not student:
        student = await db.students.find_one({"full_name": current_user["full_name"]})
    
    if not student:
        return []
    
    student_name = student.get("full_name") or student.get("name")
    attendance = await db.attendance.find({"student_name": student_name}).to_list(None)
    
    # Remove duplicates
    seen = set()
    unique_attendance = []
    for a in attendance:
        key = f"{a.get('student_name', '')}_{a.get('date', '')}"
        if key not in seen:
            seen.add(key)
            unique_attendance.append(a)
    
    result = []
    for a in unique_attendance:
        result.append({
            "date": a["date"],
            "time": a["time"],
            "status": "Present",
            "confidence": a.get("confidence", 0)
        })
    
    result.sort(key=lambda x: x["date"], reverse=True)
    return result

@router.get("/date/{date}")
async def get_attendance_by_date(date: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    
    attendance = await db.attendance.find({"date": date}).to_list(None)
    
    # Remove duplicates
    seen = set()
    unique_attendance = []
    for a in attendance:
        key = f"{a['student_name']}_{a['date']}"
        if key not in seen:
            seen.add(key)
            unique_attendance.append(a)
    
    result = []
    for a in unique_attendance:
        result.append({
            "id": str(a["_id"]),
            "student_name": a["student_name"],
            "time": a["time"],
            "confidence": a.get("confidence", 0)
        })
    
    return result

@router.get("/summary")
async def get_attendance_summary(current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    
    total_students = await db.students.count_documents({})
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Count unique students today
    today_records = await db.attendance.find({"date": today}).to_list(None)
    seen = set()
    for r in today_records:
        seen.add(r["student_name"])
    today_present = len(seen)
    
    current_month = datetime.now().strftime("%Y-%m")
    monthly_records = await db.attendance.find({"date": {"$regex": f"^{current_month}"}}).to_list(None)
    seen_month = set()
    for r in monthly_records:
        seen_month.add(r["student_name"])
    monthly_present = len(seen_month)
    
    return {
        "total_students": total_students,
        "today_present": today_present,
        "today_absent": total_students - today_present,
        "monthly_present": monthly_present,
        "attendance_percentage": (today_present / total_students * 100) if total_students > 0 else 0
    }

@router.get("/average")
async def get_average_attendance(current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    total_students = await db.students.count_documents({})
    if total_students == 0:
        return {"average": 0}
    
    today = datetime.now().strftime("%Y-%m-%d")
    today_records = await db.attendance.find({"date": today}).to_list(None)
    unique_students = len(set([r.get("student_name") for r in today_records]))
    
    average = round((unique_students / total_students) * 100)
    if average > 100:
        average = 100
    
    return {"average": average}

@router.post("/mark-by-class")
async def mark_attendance_by_class(
    class_id: str,
    student_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    
    # Verify teacher owns this class
    class_obj = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_obj or class_obj["teacher_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not your class")
    
    today = datetime.now().strftime("%Y-%m-%d")
    results = []
    
    for student_id in student_ids:
        # Check if already marked today
        existing = await db.attendance.find_one({
            "student_id": student_id,
            "class_id": class_id,
            "date": today
        })
        
        if not existing:
            # Get student for roll_number
            student = await db.students.find_one({"_id": ObjectId(student_id)})
            
            attendance = {
                "student_id": student_id,
                "student_name": student.get("name") if student else "",
                "roll_number": student.get("roll_number", "") if student else "",  # ✅ ADDED
                "class_id": class_id,
                "class_name": class_obj["class_name"],
                "teacher_id": str(current_user["_id"]),
                "teacher_name": current_user["full_name"],
                "date": today,
                "time": datetime.now().strftime("%H:%M:%S"),
                "status": "present",
                "semester": class_obj.get("semester", "Current"),
                "subject": class_obj.get("subject", "")
            }
            await db.attendance.insert_one(attendance)
            results.append({"student_id": student_id, "status": "marked"})
    
    return {"message": f"Marked {len(results)} students", "results": results}

@router.post("/manual")
async def manual_attendance(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Manual attendance marking by teacher/admin"""
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    db = get_database()
    
    student_id = request.get("student_id")
    class_id = request.get("class_id")
    status = request.get("status", "present")
    
    if not student_id or not class_id:
        raise HTTPException(status_code=400, detail="student_id and class_id required")
    
    today = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().strftime("%H:%M:%S")
    
    # Check if already marked
    existing = await db.attendance.find_one({
        "student_id": student_id,
        "class_id": class_id,
        "date": today
    })
    
    if existing:
        return {"message": "Already marked today", "success": False}
    
    # Get student and class info
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    class_info = await db.classes.find_one({"_id": ObjectId(class_id)})
    
    if not student or not class_info:
        raise HTTPException(status_code=404, detail="Student or Class not found")
    
    # Mark attendance
    attendance = {
        "student_id": student_id,
        "student_name": student.get("name"),
        "roll_number": student.get("roll_number"),  # ✅ ADDED
        "class_id": class_id,
        "class_name": class_info.get("class_name"),
        "date": today,
        "time": current_time,
        "status": status,
        "confidence": 1.0,
        "marked_by": str(current_user["_id"]),
        "marked_by_name": current_user.get("full_name"),
        "manual_mark": True,
        "created_at": datetime.now()
    }
    
    await db.attendance.insert_one(attendance)
    
    return {
        "message": f"Attendance marked for {student.get('name')}", 
        "success": True
    }

@router.post("/manual-bulk")
async def manual_attendance_bulk(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Bulk manual attendance marking by teacher/admin"""
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    db = get_database()
    
    student_ids = request.get("student_ids", [])
    class_id = request.get("class_id")
    status = request.get("status", "present")
    
    if not student_ids:
        raise HTTPException(status_code=400, detail="No students selected")
    
    if not class_id:
        raise HTTPException(status_code=400, detail="No class selected")
    
    today = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().strftime("%H:%M:%S")
    
    marked_count = 0
    for student_id in student_ids:
        # Check if already marked today
        existing = await db.attendance.find_one({
            "student_id": student_id,
            "class_id": class_id,
            "date": today
        })
        
        if not existing:
            student = await db.students.find_one({"_id": ObjectId(student_id)})
            class_info = await db.classes.find_one({"_id": ObjectId(class_id)})
            
            if student and class_info:
                attendance = {
                    "student_id": student_id,
                    "student_name": student.get("name"),
                    "roll_number": student.get("roll_number", ""),  # ✅ ADDED
                    "class_id": class_id,
                    "class_name": class_info.get("class_name", ""),
                    "date": today,
                    "time": current_time,
                    "status": status,
                    "confidence": 1.0,
                    "marked_by": str(current_user["_id"]),
                    "marked_by_name": current_user.get("full_name", ""),
                    "manual_mark": True,
                    "created_at": datetime.now()
                }
                await db.attendance.insert_one(attendance)
                marked_count += 1
    
    return {
        "message": f"Marked {marked_count} students as {status}",
        "success": True,
        "marked_count": marked_count
    }

@router.get("/accuracy")
async def calculate_accuracy(current_user: dict = Depends(get_current_user)):
    """Calculate current system accuracy"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    # Get all attendance records
    attendance = await db.attendance.find().to_list(None)
    
    if len(attendance) == 0:
        return {"message": "No attendance records found"}
    
    # Calculate metrics
    total_records = len(attendance)
    high_confidence = 0  # confidence > 0.7
    medium_confidence = 0  # confidence 0.5-0.7
    low_confidence = 0  # confidence < 0.5
    
    daily_stats = {}
    student_stats = {}
    
    for a in attendance:
        conf = a.get('confidence', 0)
        
        if conf > 0.7:
            high_confidence += 1
        elif conf > 0.5:
            medium_confidence += 1
        else:
            low_confidence += 1
        
        # Daily stats
        date = a.get('date', 'unknown')
        if date not in daily_stats:
            daily_stats[date] = {'count': 0, 'total_conf': 0}
        daily_stats[date]['count'] += 1
        daily_stats[date]['total_conf'] += conf
        
        # Student stats
        student_name = a.get('student_name', 'unknown')
        if student_name not in student_stats:
            student_stats[student_name] = {'count': 0, 'total_conf': 0}
        student_stats[student_name]['count'] += 1
        student_stats[student_name]['total_conf'] += conf
    
    # Calculate average confidence
    avg_confidence = sum([a.get('confidence', 0) for a in attendance]) / total_records
    
    # Calculate accuracy score (simplified)
    # High confidence = correct recognition, Low confidence = potential error
    accuracy_score = (high_confidence / total_records) * 100
    
    # Daily averages for graph
    daily_averages = []
    for date, stats in sorted(daily_stats.items()):
        daily_averages.append({
            'date': date,
            'attendance_count': stats['count'],
            'average_confidence': stats['total_conf'] / stats['count'] if stats['count'] else 0
        })

    student_averages = []
    for student_name, stats in sorted(student_stats.items()):
        student_averages.append({
            'student_name': student_name,
            'attendance_count': stats['count'],
            'average_confidence': stats['total_conf'] / stats['count'] if stats['count'] else 0
        })

    return {
        'total_records': total_records,
        'average_confidence': avg_confidence,
        'accuracy_score': accuracy_score,
        'confidence_breakdown': {
            'high': high_confidence,
            'medium': medium_confidence,
            'low': low_confidence
        },
        'daily_averages': daily_averages,
        'student_averages': student_averages
    }

# Get class-wise attendance for today with present/absent status
@router.get("/class/{class_id}/today")
async def get_class_attendance_today(
    class_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Get class info first
    class_obj = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Verify teacher has access to this class (only if teacher, admin can view all)
    if current_user["role"] == "teacher":
        if class_obj["teacher_id"] != str(current_user["_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all students enrolled in this class
    students = await db.students.find({"class_id": class_id}).to_list(None)
    
    # Get today's attendance records for this class
    attendance_records = await db.attendance.find({
        "class_id": class_id,
        "date": today
    }).to_list(None)
    
    # Create map of present students
    present_map = {}
    for a in attendance_records:
        student_name = a.get("student_name")
        if student_name:
            present_map[student_name] = {
                "time": a.get("time"),
                "confidence": a.get("confidence")
            }
    
    # Prepare result with present/absent status
    result_students = []
    for student in students:
        student_name = student.get("name")
        if student_name in present_map:
            result_students.append({
                "student_id": str(student["_id"]),
                "student_name": student_name,
                "roll_number": student.get("roll_number", ""),
                "status": "present",
                "time": present_map[student_name].get("time"),
                "confidence": present_map[student_name].get("confidence")
            })
        else:
            result_students.append({
                "student_id": str(student["_id"]),
                "student_name": student_name,
                "roll_number": student.get("roll_number", ""),
                "status": "absent",
                "time": None,
                "confidence": None
            })
    
    return {
        "class_id": class_id,
        "class_name": class_obj.get("class_name", ""),
        "section": class_obj.get("section", ""),
        "subject": class_obj.get("subject", ""),
        "date": today,
        "total_students": len(students),
        "present_count": len(present_map),
        "absent_count": len(students) - len(present_map),
        "students": result_students
    }

# Mark attendance for specific class with class_id
@router.post("/recognize-with-class")
async def recognize_face_with_class(
    file: UploadFile = File(...),
    class_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    
    # Get class info
    db = get_database()
    class_info = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_info:
        return {"recognized": False, "message": "Class not found"}
    
    # Verify teacher owns this class
    if class_info["teacher_id"] != str(current_user["_id"]):
        return {"recognized": False, "message": "You don't have access to this class"}
    
    # Get all students enrolled in this class
    class_students = await db.students.find({"class_id": class_id}).to_list(None)
    class_student_roll_numbers = [s.get("roll_number") for s in class_students]
    
    if not KNOWN_ENCODINGS:
        return {"recognized": False, "message": "Face recognition model not loaded"}
    
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"recognized": False, "message": "Invalid image"}
    
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb_img)
    face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
    
    if not face_encodings:
        return {"recognized": False, "message": "No face detected"}
    
    today = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().strftime("%H:%M:%S")
    
    for face_encoding in face_encodings:
        distances = face_recognition.face_distance(KNOWN_ENCODINGS, face_encoding)
        best_match_index = np.argmin(distances)
        
        if distances[best_match_index] < 0.45:
            # ✅ KNOWN_NAMES mein roll numbers hain
            roll_number = KNOWN_NAMES[best_match_index]
            confidence = 1 - distances[best_match_index]
            
            # ✅ Get student by roll_number
            student = await db.students.find_one({"roll_number": roll_number})
            if not student:
                return {
                    "recognized": True,
                    "name": roll_number,
                    "roll_number": roll_number,
                    "confidence": confidence,
                    "message": f"Student with roll number {roll_number} not found in database"
                }
            
            student_name = student.get("name", roll_number)
            
            # ✅ Check if student belongs to this class
            if roll_number not in class_student_roll_numbers:
                return {
                    "recognized": True,
                    "name": student_name,
                    "roll_number": roll_number,
                    "confidence": confidence,
                    "not_in_class": True,
                    "message": f"{student_name} is not enrolled in {class_info.get('class_name')}"
                }
            
            # Check if already marked today for this class
            existing = await db.attendance.find_one({
                "roll_number": roll_number,
                "class_id": class_id,
                "date": today
            })
            
            if existing:
                return {
                    "recognized": True,
                    "name": student_name,
                    "roll_number": roll_number,
                    "confidence": confidence,
                    "already_marked": True,
                    "message": f"ℹ️ {student_name} already marked today"
                }
            
            # Insert new attendance with roll_number
            try:
                await db.attendance.insert_one({
                    "student_name": student_name,
                    "student_id": str(student["_id"]),
                    "roll_number": roll_number,  # ✅ Primary key
                    "class_id": class_id,
                    "class_name": class_info.get("class_name", ""),
                    "course_name": class_info.get("subject", ""),
                    "date": today,
                    "time": current_time,
                    "confidence": confidence,
                    "marked_by": str(current_user["_id"]),
                    "created_at": datetime.now()
                })
                
                return {
                    "recognized": True,
                    "name": student_name,
                    "roll_number": roll_number,
                    "confidence": confidence,
                    "time": current_time,
                    "message": f"✅ {student_name} marked present for {class_info.get('class_name')}"
                }
            except Exception as e:
                return {
                    "recognized": True,
                    "name": student_name,
                    "roll_number": roll_number,
                    "already_marked": True,
                    "message": f"ℹ️ {student_name} already marked today"
                }
    
    return {"recognized": False, "message": "Face not recognized"}

@router.post("/manual-bulk")
async def manual_attendance_bulk(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    db = get_database()
    
    student_ids = request.get("student_ids", [])
    class_id = request.get("class_id")
    status = request.get("status", "present")
    
    if not student_ids:
        raise HTTPException(status_code=400, detail="No students selected")
    
    if not class_id:
        raise HTTPException(status_code=400, detail="No class selected")
    
    today = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().strftime("%H:%M:%S")
    
    marked_count = 0
    for student_id in student_ids:
        existing = await db.attendance.find_one({
            "student_id": student_id,
            "class_id": class_id,
            "date": today
        })
        
        if not existing:
            student = await db.students.find_one({"_id": ObjectId(student_id)})
            class_info = await db.classes.find_one({"_id": ObjectId(class_id)})
            
            if student and class_info:
                attendance = {
                    "student_id": student_id,
                    "student_name": student.get("name"),
                    "roll_number": student.get("roll_number", ""),
                    "class_id": class_id,
                    "class_name": class_info.get("class_name", ""),
                    "date": today,
                    "time": current_time,
                    "status": status,
                    "confidence": 1.0,
                    "marked_by": str(current_user["_id"]),
                    "manual_mark": True,
                    "created_at": datetime.now()
                }
                await db.attendance.insert_one(attendance)
                marked_count += 1
    
    return {
        "message": f"Marked {marked_count} students as {status}",
        "success": True,
        "marked_count": marked_count
    }
