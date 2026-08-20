from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class ClassModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    class_name: str = Field(..., min_length=1, max_length=100)
    section: str = Field(..., min_length=1, max_length=10)
    subject: str = Field(..., min_length=1, max_length=100)
  # teacher_id: str = Field(...)  # Teacher's user ID
  # created_at: datetime = Field(default_factory=datetime.now)
    teacher_id: Optional[str] = None
    created_at: Optional[datetime] = None
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True