from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class StudentModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(...)
    roll_number: str = Field(..., min_length=1, max_length=50)
    university_roll_no: str = Field(..., min_length=1, max_length=50)
    class_ids: List[str] = Field(default=[])  # ✅ Multiple classes (array)
    enrolled_courses: List[dict] = Field(default=[])  # ✅ {class_id, class_name, course_name}
    class_id: str = Field(...)
    mobile_number: str = Field(..., min_length=10, max_length=15)
    father_mobile: str = Field(..., min_length=10, max_length=15)
    photo_url: Optional[str] = None
    face_encoding: Optional[List[float]] = None
    user_id: Optional[str] = None  # Link to user account
    created_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        populate_by_name = True