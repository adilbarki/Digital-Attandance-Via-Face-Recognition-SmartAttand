from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class AttendanceModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    student_id: str = Field(...)
    student_name: str = Field(...)
    class_id: str = Field(...)  # ✅ Added class_id
    class_name: str = Field(...)  # ✅ Added class_name
    course_name: str = Field(...)  # ✅ Added course_name
    date: str = Field(...)
    time: str = Field(...)
    status: str = Field(default="present")
    confidence: float = Field(default=0)
    marked_by: str = Field(...)
    created_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True