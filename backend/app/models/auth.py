from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(...)
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(teacher|student|admin)$")
    full_name: str = Field(..., min_length=2, max_length=100)
    student_id: Optional[str] = None
    teacher_id: Optional[str] = None  
    class_id: Optional[str] = None

class LoginRequest(BaseModel):
    email: str = Field(...)
    password: str = Field(...)
    remember_me: bool = Field(default=False)

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    role: str
    full_name: str

class ForgotPasswordRequest(BaseModel):
    email: str = Field(...)

class ResetPasswordRequest(BaseModel):
    token: str = Field(...)
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    full_name: str
    student_id: Optional[str]
    class_id: Optional[str]
    is_active: bool
    created_at: datetime