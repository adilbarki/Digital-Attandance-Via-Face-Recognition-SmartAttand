from fastapi import APIRouter, HTTPException, Request, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.auth import SignupRequest, LoginRequest, LoginResponse, UserResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.utils.auth import hash_password, verify_password, create_access_token, decode_access_token
# from app.utils.email_service import send_welcome_email
from app.services.email_service import send_login_alert, send_welcome_email, send_password_reset_email  # ✅ SIRF ADD KIYA
from fastapi import BackgroundTasks
from app.utils.db import get_database
from app.config.settings import settings
from datetime import datetime, timedelta
from bson import ObjectId
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# Email configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Signup
@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: SignupRequest,
                #   background_tasks: BackgroundTasks 
                    ):
    db = get_database()
    
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    if user_data.role == "student" and not user_data.student_id:
        raise HTTPException(status_code=400, detail="Student ID is required for students")
    
    user_doc = {
        "username": user_data.username,
        "email": user_data.email.lower(),
        "password": hash_password(user_data.password),
        "role": user_data.role,
        "full_name": user_data.full_name,
        "student_id": user_data.student_id if user_data.role == "student" else None,
        "teacher_id": user_data.teacher_id if user_data.role == "teacher" else None,  
        "class_id": user_data.class_id if user_data.role == "student" else None,
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    result = await db.users.insert_one(user_doc)
    
    # ✅ Send welcome email (non-blocking)
    # await send_welcome_email(
    #     email=user_data.email,
    #     name=user_data.full_name,
    #     role=user_data.role,
    #     password=user_data.password if user_data.password else None,
    #     background_tasks=background_tasks
    # )

    try:
        send_welcome_email(
             to_email=user_data.email,
             name=user_data.full_name,
             password=user_data.password
       )
    except Exception as e:
        print(f"⚠️ Email not sent: {e}")

    return UserResponse(
        id=str(result.inserted_id),
        username=user_data.username,
        email=user_data.email,
        role=user_data.role,
        full_name=user_data.full_name,
        student_id=user_data.student_id if user_data.role == "student" else None,
        teacher_id=user_data.teacher_id if user_data.role == "teacher" else None,
        class_id=user_data.class_id if user_data.role == "student" else None,
        is_active=True,
        created_at=datetime.now()
    )


# Login with Remember Me
@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, request: Request):
    db = get_database()
    
    user = await db.users.find_one({"email": login_data.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    # ✅ NEW: Device tracking with login alert (SIRF ADD KIYA)
    try:
        ip_address = request.client.host if request.client else "Unknown"
        user_agent = request.headers.get("user-agent", "Unknown")
        
        device_id = f"{user_agent[:30]}_{ip_address}"
        
        existing_device = await db.user_devices.find_one({
            "user_id": str(user["_id"]),
            "device_id": device_id
        })
        
        if not existing_device:
            # New device detected - send login alert
            send_login_alert(
                to_email=user["email"],
                name=user.get("full_name", user["username"]),
                ip_address=ip_address,
                user_agent=user_agent
            )
            print(f"🔐 New device login alert sent to {user['email']}")
            
            # Save device
            await db.user_devices.insert_one({
                "user_id": str(user["_id"]),
                "device_id": device_id,
                "user_agent": user_agent,
                "ip_address": ip_address,
                "last_login": datetime.now(),
                "created_at": datetime.now()
            })
        else:
            # Update last login
            await db.user_devices.update_one(
                {"_id": existing_device["_id"]},
                {"$set": {"last_login": datetime.now()}}
            )
    except Exception as e:
        print(f"⚠️ Device tracking failed: {e}")
    
    # Set expiry based on remember me
    if login_data.remember_me:
        expires_delta = timedelta(days=30)
    else:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    token_data = {
        "sub": user["email"],
        "user_id": str(user["_id"]),
        "role": user["role"]
    }
    access_token = create_access_token(token_data, expires_delta)
    
    return LoginResponse(
        access_token=access_token,
        user_id=str(user["_id"]),
        username=user["username"],
        role=user["role"],
        full_name=user["full_name"]
    )


# Forgot Password - Send Reset Email
@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    db = get_database()
    
    user = await db.users.find_one({"email": request.email.lower()})
    if not user:
        return {"message": "If your email is registered, you will receive a reset link"}
    
    reset_token = secrets.token_urlsafe(32)
    reset_expiry = datetime.now() + timedelta(hours=1)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expiry": reset_expiry
        }}
    )
    
    # ✅ NEW: Use Brevo email service (SIRF ADD KIYA)
    try:
        send_password_reset_email(
            to_email=user["email"],
            name=user.get("full_name", user["username"]),
            reset_token=reset_token
        )
        print(f"✅ Password reset email sent to {user['email']}")
        return {"message": "Password reset email sent successfully"}
    except Exception as e:
        print(f"❌ Password reset email failed: {e}")
        return {"message": "If your email is registered, you will receive a reset link"}

# Reset Password
@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    db = get_database()
    
    if request.new_password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    user = await db.users.find_one({"reset_token": request.token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    if user.get("reset_token_expiry") < datetime.now():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password": hash_password(request.new_password),
            "reset_token": None,
            "reset_token_expiry": None,
            "updated_at": datetime.now()
        }}
    )
    
    return {"message": "Password reset successfully"}

def send_reset_email(to_email: str, name: str, reset_link: str):
    if not SMTP_USER or not SMTP_PASSWORD:
        print("Email not configured. Reset link:", reset_link)
        return
    
    subject = "SmartAttend - Password Reset Request"
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4f46e5; color: white; padding: 20px; text-align: center;">
                <h2>SmartAttend</h2>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <h3>Hello {name},</h3>
                <p>We received a request to reset your password.</p>
                <p style="text-align: center;">
                    <a href="{reset_link}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Reset Password</a>
                </p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
                <p>&copy; 2026 SmartAttend. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    msg = MIMEMultipart()
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_content, "html"))
    
    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Reset email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")

# Get current user from token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    print(">>> get_current_user CALLED <<<")

    token = credentials.credentials
    print(f"Token received: {token[:50]}...") 

    payload = decode_access_token(token)
    print(f"Decoded payload: {payload}")

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    db = get_database()
    user = await db.users.find_one({"email": payload.get("sub")})
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    user = await db.users.find_one({"email": payload.get("sub")})

    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    return user

# Get current user info
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        username=current_user["username"],
        email=current_user["email"],
        role=current_user["role"],
        full_name=current_user["full_name"],
        student_id=current_user.get("student_id"),
        class_id=current_user.get("class_id"),
        is_active=current_user.get("is_active", True),
        created_at=current_user["created_at"]
    )
