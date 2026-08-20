from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from app.utils.db import get_database
from app.routes.auth import get_current_user
import numpy as np
import os
import pickle
import face_recognition

router = APIRouter(prefix="/accuracy", tags=["Accuracy"])

# Load face recognition model
MODEL_PATH = "face_data/encodings/face_recognition_model.pkl"
KNOWN_ENCODINGS = []
KNOWN_NAMES = []

if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, 'rb') as f:
        data = pickle.load(f)
        KNOWN_ENCODINGS = data['encodings']
        KNOWN_NAMES = data['names']

@router.get("/dashboard")
async def get_accuracy_dashboard(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    # ✅ NEW: Sirf last 90 days ke records lo
    cutoff_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    
    # Get attendance records only from last 90 days
    attendance = await db.attendance.find({
        "date": {"$gte": cutoff_date}
    }).to_list(None)

    print(f"📊 Total attendance records (last 90 days): {len(attendance)}")  
    
    if len(attendance) == 0:
        return {
            "total_records": 0,
            "accuracy_percent": 0,
            "estimated_accuracy": 0,
            "high_confidence": 0,
            "medium_confidence": 0,
            "low_confidence": 0,
            "average_confidence": 0,
            "daily_trend": [],
            "class_wise": []
        }
    
    # Calculate metrics
    high_confidence = 0
    medium_confidence = 0
    low_confidence = 0
    total_confidence = 0
    
    daily_data = {}
    class_data = {}
    
    for a in attendance:
        conf = a.get('confidence', 0)
        total_confidence += conf

        if conf > 0.7:
            high_confidence += 1
        elif conf > 0.5:
            medium_confidence += 1
        else:
            low_confidence += 1
        
        # Daily trend
        date = a.get('date', '')
        if date:
            if date not in daily_data:
                daily_data[date] = {'total_conf': 0, 'count': 0}
            daily_data[date]['total_conf'] += conf
            daily_data[date]['count'] += 1
        
        # Class wise
        class_name = a.get('class_name', 'Unknown')
        if class_name not in class_data:
            class_data[class_name] = {'total_conf': 0, 'count': 0}
        class_data[class_name]['total_conf'] += conf
        class_data[class_name]['count'] += 1
    
    total = len(attendance)
    avg_confidence = (total_confidence / total * 100) if total > 0 else 0
    
    estimated_accuracy = avg_confidence
    
    # Daily trend (last 30 days) - already filtered by date
    daily_trend = []
    for date, data in sorted(daily_data.items())[-30:]:
        daily_trend.append({
            'date': date,
            'accuracy': round((data['total_conf'] / data['count']) * 100, 2),
            'count': data['count']
        })
    
    # Class wise accuracy
    class_wise = []
    for class_name, data in class_data.items():
        class_wise.append({
            'class_name': class_name,
            'accuracy': round((data['total_conf'] / data['count']) * 100, 2),
            'count': data['count']
        })
    
    return {
        'total_records': total,
        'accuracy_percent': round(estimated_accuracy, 2),
        'estimated_accuracy': round(estimated_accuracy, 2),
        'high_confidence': high_confidence,
        'medium_confidence': medium_confidence,
        'low_confidence': low_confidence,
        'average_confidence': round(avg_confidence, 2),
        'daily_trend': daily_trend,
        'class_wise': class_wise
    }

@router.get("/test")
async def test_accuracy(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    test_folder = "face_data/test_images"
    if not os.path.exists(test_folder):
        return {
            "total_tests": 0,
            "correct": 0,
            "incorrect": 0,
            "accuracy_percent": 0,
            "results": [],
            "message": "No test images found. Create 'face_data/test_images' folder"
        }
    
    correct = 0
    total = 0
    results = []
    
    for person_name in os.listdir(test_folder):
        person_path = os.path.join(test_folder, person_name)
        if not os.path.isdir(person_path):
            continue
        
        for img_file in os.listdir(person_path):
            if img_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                img_path = os.path.join(person_path, img_file)
                
                image = face_recognition.load_image_file(img_path)
                face_encodings = face_recognition.face_encodings(image)
                
                if face_encodings:
                    distances = face_recognition.face_distance(KNOWN_ENCODINGS, face_encodings[0])
                    best_match_index = np.argmin(distances)
                    
                    if distances[best_match_index] < 0.45:
                        recognized_name = KNOWN_NAMES[best_match_index]
                        is_correct = (recognized_name == person_name)
                        if is_correct:
                            correct += 1
                        total += 1
                        
                        results.append({
                            'expected': person_name,
                            'recognized': recognized_name,
                            'confidence': round(1 - distances[best_match_index], 3),
                            'correct': is_correct
                        })
    
    test_accuracy = (correct / total * 100) if total > 0 else 0
    
    return {
        'total_tests': total,
        'correct': correct,
        'incorrect': total - correct,
        'accuracy_percent': round(test_accuracy, 2),
        'results': results[-20:]
    }