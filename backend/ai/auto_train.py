import logging
import os
import pickle
import asyncio
from app.utils.db import get_database
from .train_face_recognition import train_model

MODEL_PATH = "face_data/encodings/face_recognition_model.pkl"
logger = logging.getLogger(__name__)

async def check_and_retrain():
    """Check if new students added and retrain model"""
    db = get_database()
    
    # Get all students with photos
    students = await db.students.find({"photo_url": {"$ne": None}}).to_list(None)
    total_students = len(students)
    
    # Get trained students count
    model_path = "face_data/encodings/face_recognition_model.pkl"
    trained_count = 0
    
    if os.path.exists(model_path):
        try:
            with open(model_path, 'rb') as f:
                data = pickle.load(f)
                trained_count = len(data.get('names', []))
        except:
            pass
    
    # If new students found, retrain
    if total_students > trained_count:
        print(f"🔄 New students detected! Total: {total_students}, Trained: {trained_count}")
        print("📸 Retraining model...")
        
        # Train the model
        success = train_model()
        
        if success:
            print("✅ Model retrained successfully!")
        else:
            print("⚠️ Retraining failed, but system will continue")
        
        return success
    
    print("✅ Model is up to date")
    return True

# Call this after student addition
async def auto_retrain_on_student_add():
    await check_and_retrain()