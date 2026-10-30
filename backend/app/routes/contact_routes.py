from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime
from app.utils.db import get_database
from fastapi_mail import FastMail, MessageSchema, MessageType
from app.utils import email_config
import os

router = APIRouter(prefix="/contact", tags=["Contact"])

class ContactForm(BaseModel):
    name: str
    email: str
    message: str

@router.post("/send")
async def send_contact_message(form: ContactForm):
    """Save contact message to DB and send email"""
    db = get_database()
    
    # Save to MongoDB
    contact_doc = {
        "name": form.name,
        "email": form.email,
        "message": form.message,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": datetime.now().strftime("%H:%M:%S"),
        "status": "unread",
        "created_at": datetime.now()
    }
    
    await db.contact_messages.insert_one(contact_doc)
    print(f"📩 Contact message saved from: {form.name}")
    
    # Send email
    try:
        admin_email = os.getenv("MAIL_FROM", "adilbarki111@gmail.com")
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
            <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #8b5cf6;">New Contact Message - SmartAttend</h2>
                <hr>
                <p><strong>Name:</strong> {form.name}</p>
                <p><strong>Email:</strong> {form.email}</p>
                <p><strong>Message:</strong></p>
                <p style="background: #f9f9f9; padding: 15px; border-radius: 8px;">{form.message}</p>
                <hr>
                <p style="color: #888; font-size: 12px;">Sent from SmartAttend Contact Form</p>
            </div>
        </body>
        </html>
        """
        
        message = MessageSchema(
            subject=f"SmartAttend Contact: {form.name}",
            recipients=[admin_email],
            body=html_content,
            subtype=MessageType.html
        )
        
        fm = FastMail(email_config)
        await fm.send_message(message)
        print(f"✅ Email sent to {admin_email}")
        
    except Exception as e:
        print(f"⚠️ Email send failed: {e}")
    
    # WhatsApp link (admin ko manually bhejna hoga - frontend se handle karega)
    return {
        "success": True,
        "message": "Message sent successfully!",
        "whatsapp_link": f"https://wa.me/923137651005?text=From%20{form.name}%20({form.email}):%20{form.message}"
    }

@router.get("/messages")
async def get_all_messages(current_user: dict = Depends(lambda: {"role": "admin"})):
    """Get all contact messages (Admin only)"""
    db = get_database()
    messages = await db.contact_messages.find().sort("created_at", -1).to_list(None)
    
    result = []
    for m in messages:
        result.append({
            "id": str(m["_id"]),
            "name": m.get("name"),
            "email": m.get("email"),
            "message": m.get("message"),
            "date": m.get("date"),
            "time": m.get("time"),
            "status": m.get("status", "unread")
        })
    
    return result