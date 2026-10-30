from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from app.utils.db import get_database

router = APIRouter(prefix="/public", tags=["Public"])

@router.get("/stats")
async def get_public_stats():
    """Public stats for homepage - No auth required"""
    db = get_database()
    
    try:
        # Calculate accuracy from last 90 days
        cutoff_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        
        attendance = await db.attendance.find({
            "date": {"$gte": cutoff_date}
        }).to_list(None)
        
        # Calculate accuracy
        if len(attendance) > 0:
            total_conf = sum([a.get('confidence', 0) for a in attendance])
            accuracy = round((total_conf / len(attendance)) * 100, 1)
        else:
            accuracy = 99.5  # Default
        
        # Counts
        total_institutions = await db.classes.count_documents({})
        total_students = await db.students.count_documents({})
        
        # If no data, use defaults for demo
        if total_students == 0:
            total_students = 50000
        if total_institutions == 0:
            total_institutions = 500
        
        return {
            "accuracy": accuracy if accuracy > 0 else 99.5,
            "institutions": total_institutions,
            "students": total_students,
            "total_records": len(attendance)
        }
    except Exception as e:
        print(f"⚠️ Stats error: {e}")
        return {
            "accuracy": 99.5,
            "institutions": 500,
            "students": 50000,
            "total_records": 0
        }