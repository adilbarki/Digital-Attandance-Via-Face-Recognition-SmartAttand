from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import os
import shutil
from app.models.student import StudentModel
from app.utils.db import get_database
from app.routes.auth import get_current_user
from app.utils.auth import hash_password
from bson import ObjectId
import cloudinary.uploader
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Request

router = APIRouter(prefix="/students", tags=["Students"])

# Upload directory
UPLOAD_DIR = "uploads/students"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ✅ Pydantic model for update request
class UpdateStudentRequest(BaseModel):
    name: str
    email: str
    roll_number: str
    university_roll_no: Optional[str] = ""
    class_id: str
    mobile_number: str
    father_mobile: Optional[str] = ""
    photo_url: Optional[str] = ""

# ============================================================
# HELPER FUNCTION - Find student by user_id, email, roll_number
# ============================================================
async def find_student_by_user(db, user_id: str):
    """Find student by user_id, email, username, or full_name"""
    # Get user details
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return None, None
    
    # ✅ Try multiple ways to find student
    student = await db.students.find_one({"user_id": user_id})
    if not student:
        student = await db.students.find_one({"user_id": str(ObjectId(user_id))})
    if not student and user.get("email"):
        student = await db.students.find_one({"email": user["email"]})
    if not student and user.get("username"):
        student = await db.students.find_one({"roll_number": user["username"]})
    if not student and user.get("full_name"):
        student = await db.students.find_one({"name": user["full_name"]})
    
    return student, user

# ============================================================
# SPECIFIC ROUTES (NO PARAMETERS) - MUST BE FIRST
# ============================================================

@router.get("/profile")
async def get_student_profile(current_user: dict = Depends(get_current_user)):
    from bson import ObjectId
    db = get_database()
    
    print(">>> PROFILE ENDPOINT HIT <<<")
    print(f"User email: {current_user.get('email')}")
    
    student = await db.students.find_one({"email": current_user["email"]})
    
    if not student:
        print("Student not found, using default")
        return {
            "name": current_user.get("full_name", "Student"),
            "roll_number": "",
            "email": current_user["email"],
            "mobile_number": "",
            "father_mobile": "",
            "photo_url": "",
            "class_name": "Not Assigned",
            "section": "Not Assigned",
            "subject": "Not Assigned"
        }
    
    print(f"Student found: {student.get('name')}")
    
    class_name = "Not Assigned"
    section = "Not Assigned"
    subject = "Not Assigned"
    
    if student.get("class_id"):
        class_info = await db.classes.find_one({"_id": ObjectId(student["class_id"])})
        if class_info:
            class_name = class_info.get("class_name", "Not Assigned")
            section = class_info.get("section", "Not Assigned")
            subject = class_info.get("subject", "Not Assigned")
            print(f"Class: {class_name}, Section: {section}")
    
    return {
        "name": student.get("name", ""),
        "roll_number": student.get("roll_number", ""),
        "email": student.get("email", ""),
        "mobile_number": student.get("mobile_number", ""),
        "father_mobile": student.get("father_mobile", ""),
        "photo_url": student.get("photo_url", ""),
        "class_name": class_name,
        "section": section,
        "subject": subject
    }

# Auto-retraining trigger after adding student
@router.post("/add-with-train")
async def add_student_with_train(
    name: str = Form(...),
    email: str = Form(...),
    roll_number: str = Form(...),
    university_roll_no: str = Form(...),
    class_id: str = Form(...),
    mobile_number: str = Form(...),
    father_mobile: str = Form(...),
    photo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    result = await add_student(
        name, email, roll_number, university_roll_no,
        class_id, mobile_number, father_mobile, photo, current_user
    )
    
    import subprocess
    import sys
    subprocess.Popen([sys.executable, "ai/train_face_recognition.py"])
    
    return {**result, "message": "Student added, model training started in background"}

@router.get("/all")
async def get_all_students(current_user: dict = Depends(get_current_user)):
    try:
        db = get_database()
        students = await db.students.find().to_list(None)
        result = []
        for s in students:
            result.append({
                "id": str(s["_id"]),
                "name": s["name"],
                "roll_number": s.get("roll_number", ""),
                "email": s.get("email", ""),
                "mobile_number": s.get("mobile_number", ""),
                "father_mobile": s.get("father_mobile", ""),
                "class_id": s.get("class_id", ""),
                "photo_url": s.get("photo_url", "")
            })
        return result
    except Exception as e:
        print(f"Error in /all: {e}")
        return []

@router.get("/count")
async def get_students_count(current_user: dict = Depends(get_current_user)):
    db = get_database()
    count = await db.students.count_documents({})
    return {"count": count}

@router.get("/class/{class_id}")
async def get_students_by_class(class_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    if current_user["role"] != "teacher" and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only teachers or admin can view students")
    
    students = await db.students.find({"class_id": class_id}).to_list(None)
    
    result = []
    for s in students:
        result.append({
            "id": str(s["_id"]),
            "name": s["name"],
            "email": s["email"],
            "roll_number": s["roll_number"],
            "university_roll_no": s.get("university_roll_no", ""),
            "mobile_number": s["mobile_number"],
            "father_mobile": s["father_mobile"],
            "class_id": s["class_id"],
            "photo_url": s.get("photo_url", "")
        })
    
    return result

@router.get("/my-info")
async def get_my_info(current_user: dict = Depends(get_current_user)):
    """Legacy endpoint - redirects to profile"""
    return await get_student_profile(current_user)

# ============================================================
# DYNAMIC ROUTES (WITH PARAMETERS) - MUST BE AFTER SPECIFIC ROUTES
# ============================================================

# ✅ UPDATE student — students._id ya user_id dono se kaam karta hai
# ✅ Photo upload (multipart/form-data) aur JSON dono handle karta hai
@router.put("/{student_id}")
async def update_student(
    student_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers or admin can update students")
    
    db = get_database()
    
    # ✅ 1. Pehle students._id se dhundho
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    
    # ✅ 2. Nahi mila to user_id se dhundho
    if not student:
        student = await db.students.find_one({"user_id": student_id})
    
    # ✅ 3. Phir bhi nahi mila to users collection se email/username lo
    if not student:
        try:
            user = await db.users.find_one({"_id": ObjectId(student_id)})
            if user:
                student = await db.students.find_one({"email": user.get("email")})
            if not student and user:
                student = await db.students.find_one({"roll_number": user.get("username")})
        except:
            pass
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # ✅ Check content type
    content_type = request.headers.get("content-type", "")
    
    if "multipart/form-data" in content_type:
        # ✅ Form data (with photo)
        form = await request.form()
        update_data = {
            "name": form.get("name", student.get("name")),
            "email": form.get("email", student.get("email")),
            "roll_number": form.get("roll_number", student.get("roll_number")),
            "university_roll_no": form.get("university_roll_no", student.get("university_roll_no", "")),
            "class_id": form.get("class_id", student.get("class_id")),
            "mobile_number": form.get("mobile_number", student.get("mobile_number", "")),
            "father_mobile": form.get("father_mobile", student.get("father_mobile", "")),
            "updated_at": datetime.now()
        }
        
        # ✅ Photo upload
        photo =  form.get("photo")
        if photo and photo.filename:
            photo_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{photo.filename}"
            photo_path = os.path.join(UPLOAD_DIR, photo_filename)
            content = await photo.read()
            with open(photo_path, "wb") as buffer:
                buffer.write(content)
            update_data["photo_url"] = photo_path
    else:
        # ✅ JSON data (without photo)
        body = await request.json()
        update_data = {
            "name": body.get("name", student.get("name")),
            "email": body.get("email", student.get("email")),
            "roll_number": body.get("roll_number", student.get("roll_number")),
            "university_roll_no": body.get("university_roll_no", student.get("university_roll_no", "")),
            "class_id": body.get("class_id", student.get("class_id")),
            "mobile_number": body.get("mobile_number", student.get("mobile_number", "")),
            "father_mobile": body.get("father_mobile", student.get("father_mobile", "")),
            "photo_url": body.get("photo_url", student.get("photo_url", "")),
            "updated_at": datetime.now()
        }
    
    result = await db.students.update_one(
        {"_id": student["_id"]},
        {"$set": update_data}
    )

    print(f"🔍 Modified count: {result.modified_count}")
    
    if result.modified_count == 0:
        print("⚠️ No changes made - data might be same")
        return {"message": "No changes made", "modified": False}
    
    if student.get("user_id"):
        await db.users.update_one(
            {"_id": ObjectId(student["user_id"])},
            {"$set": {
                "email": update_data.get("email", student.get("email")),
                "full_name": update_data.get("name", student.get("name")),
                "username": update_data.get("roll_number", student.get("roll_number"))
            }}
        )
    
    return {"message": "Student updated successfully"}


# ✅ DELETE student — students._id ya user_id dono se kaam karta hai
@router.delete("/{student_id}")
async def delete_student(student_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers or admin can delete students")
    
    db = get_database()
    
    try:
        # ✅ 1. Pehle students._id se dhundho
        student = await db.students.find_one({"_id": ObjectId(student_id)})
        
        # ✅ 2. Nahi mila to user_id se dhundho
        if not student:
            student = await db.students.find_one({"user_id": student_id})
        
        # ✅ 3. Phir bhi nahi mila to users collection se email/username lo
        if not student:
            try:
                user = await db.users.find_one({"_id": ObjectId(student_id)})
                if user:
                    student = await db.students.find_one({"email": user.get("email")})
                if not student and user:
                    student = await db.students.find_one({"roll_number": user.get("username")})
            except:
                pass
        
        if not student:
            # ✅ Student record nahi mila — sirf users collection se delete karo
            await db.users.delete_one({"_id": ObjectId(student_id)})
            return {"message": "User deleted successfully"}
        
        # ✅ Students collection se delete
        await db.students.delete_one({"_id": student["_id"]})
        
        # ✅ Users collection se delete
        if student.get("user_id"):
            await db.users.delete_one({"_id": ObjectId(student["user_id"])})
        else:
            # fallback — student_id hi user_id hai
            try:
                await db.users.delete_one({"_id": ObjectId(student_id)})
            except:
                pass
        
        return {"message": "Student deleted successfully from database"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting student: {str(e)}")


# ✅ UPDATE student by user_id (with fallback)
@router.put("/by-user/{user_id}")
async def update_student_by_user_id(
    user_id: str,
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers or admin can update students")
    
    db = get_database()
    
    # ✅ Helper function use karo (email, roll_number, name se bhi dhundhega)
    student, user = await find_student_by_user(db, user_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student_id = str(student["_id"])
    
    update_data = {
        "name": request.get("name", student.get("name")),
        "email": request.get("email", student.get("email")),
        "roll_number": request.get("roll_number", student.get("roll_number")),
        "university_roll_no": request.get("university_roll_no", student.get("university_roll_no", "")),
        "class_id": request.get("class_id", student.get("class_id")),
        "mobile_number": request.get("mobile_number", student.get("mobile_number", "")),
        "father_mobile": request.get("father_mobile", student.get("father_mobile", "")),
        "photo_url": request.get("photo_url", student.get("photo_url", "")),
        "updated_at": datetime.now()
    }
    
    await db.students.update_one(
        {"_id": ObjectId(student_id)},
        {"$set": update_data}
    )
    
    if user:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "email": request.get("email", user.get("email")),
                "full_name": request.get("name", user.get("full_name")),
                "username": request.get("roll_number", user.get("username"))
            }}
        )
    
    return {"message": "Student updated successfully"}



@router.get("/{student_id}")
async def get_student(student_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    try:
        student = await db.students.find_one({"_id": ObjectId(student_id)})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        return {
            "id": str(student["_id"]),
            "name": student["name"],
            "email": student["email"],
            "roll_number": student["roll_number"],
            "university_roll_no": student.get("university_roll_no", ""),
            "mobile_number": student["mobile_number"],
            "father_mobile": student["father_mobile"],
            "class_id": student["class_id"],
            "photo_url": student.get("photo_url", "")
        }
    except:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
@router.get("/my-all-classes")
async def get_student_all_attendance(current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    student = await db.students.find_one({"user_id": str(current_user["_id"])})
    
    attendance = await db.attendance.find({
        "student_id": str(student["_id"])
    }).to_list(None)
    
    result = {}
    for a in attendance:
        class_id = a["class_id"]
        if class_id not in result:
            result[class_id] = {
                "class_name": a["class_name"],
                "subject": a.get("subject", ""),
                "records": []
            }
        result[class_id]["records"].append({
            "date": a["date"],
            "time": a["time"],
            "status": a["status"]
        })
    
    return result    

# Add Student with roll_number as primary key and Cloudinary upload + AUGMENTATION
@router.post("", status_code=status.HTTP_201_CREATED)
async def add_student(
    name: str = Form(...),
    email: str = Form(...),
    roll_number: str = Form(...),
    university_roll_no: str = Form(...),
    class_id: str = Form(...),
    mobile_number: str = Form(...),
    father_mobile: str = Form(...),
    photo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers or admin can add students")
    
    db = get_database()
    
    existing = await db.students.find_one({"roll_number": roll_number})
    if existing:
        raise HTTPException(status_code=400, detail=f"Student with roll number {roll_number} already exists")
    
    os.makedirs("face_data/dataset", exist_ok=True)
    student_folder = f"face_data/dataset/{roll_number}"
    os.makedirs(student_folder, exist_ok=True)
    
    photo_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{photo.filename}"
    local_photo_path = os.path.join(student_folder, photo_filename)
    
    with open(local_photo_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
    
    photo_url = ""
    try:
        import cloudinary.uploader
        upload_result = cloudinary.uploader.upload(
            local_photo_path,
            folder="smartattend/students",
            public_id=f"student_{roll_number}",
            overwrite=True
        )
        photo_url = upload_result.get('secure_url', '')
        print(f"✅ Uploaded to Cloudinary: {photo_url}")
    except Exception as e:
        print(f"⚠️ Cloudinary upload failed: {e}")
    
    try:
        from ai.image_augmentation import augment_image
        from ai.train_face_recognition import incremental_train
        
        augmented_paths = augment_image(
            image_path=local_photo_path,
            output_dir=student_folder,
            student_roll=roll_number,
            num_augmentations=10
        )
        
        all_images = [local_photo_path] + augmented_paths
        print(f"🔄 Training model on {len(all_images)} images for student: {roll_number}")
        
        for img_path in all_images:
            try:
                incremental_train(roll_number, img_path)
            except Exception as e:
                print(f"⚠️ Training failed for {img_path}: {e}")
        
        print(f"✅ Model trained on {len(all_images)} images for student: {roll_number}")
    except Exception as e:
        print(f"⚠️ Augmentation/Training failed: {e}")
        try:
            from ai.train_face_recognition import incremental_train
            incremental_train(roll_number, local_photo_path)
            print(f"✅ Model retrained successfully for {name} (fallback)")
        except Exception as e2:
            print(f"⚠️ Retraining failed: {e2}")
    
    user_password = f"student_{roll_number}"
    user_dict = {
        "username": roll_number,
        "email": email,
        "password": hash_password(user_password),
        "role": "student",
        "full_name": name,
        "student_id": roll_number,
        "class_id": class_id,
        "created_by": str(current_user["_id"]),
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    user_result = await db.users.insert_one(user_dict)
    
    student_dict = {
        "name": name,
        "email": email,
        "roll_number": roll_number,
        "university_roll_no": university_roll_no,
        "class_id": class_id,
        "mobile_number": mobile_number,
        "father_mobile": father_mobile,
        "photo_url": photo_url,
        "local_photo_path": local_photo_path,
        "user_id": str(user_result.inserted_id),
        "created_by": str(current_user["_id"]),
        "created_at": datetime.now()
    }
    
    result = await db.students.insert_one(student_dict)
    
    print(f"📝 Student added: {name} (Roll: {roll_number})")
    
    return {
        "id": str(result.inserted_id),
        "message": "Student added successfully",
        "default_password": user_password,
        "photo_url": photo_url
    }
