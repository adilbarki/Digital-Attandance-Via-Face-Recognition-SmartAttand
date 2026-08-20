import os
from datetime import datetime
from dotenv import load_dotenv
import sib_api_v3_sdk
from sib_api_v3_sdk import SendSmtpEmail

load_dotenv()

# Configure Brevo API
def get_brevo_client():
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = os.getenv("BREVO_API_KEY")
    return sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

def send_welcome_email(to_email: str, name: str, password: str = None):
    """Send welcome email on signup"""
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="max-width: 600px; background: #f3f4f6; padding: 30px; border-radius: 16px;">
            <h2 style="color: #4c1d95;">🎉 Welcome to SmartAttend, {name}!</h2>
            <p>Your account has been created successfully.</p>
            <div style="background: white; padding: 15px; border-radius: 12px; margin: 20px 0;">
                <p><strong>📧 Email:</strong> {to_email}</p>
                <p><strong>👤 Role:</strong> Student/Teacher</p>
                {f'<p><strong>🔑 Temporary Password:</strong> {password}</p>' if password else ''}
            </div>
            <p>Login here: <a href="http://localhost:3000/login">SmartAttend Portal</a></p>
            <p style="font-size: 12px; color: #6b7280;">Please change your password after first login.</p>
            <hr>
            <p style="font-size: 12px;">Digital Attendance via Face Recognition</p>
        </div>
    </body>
    </html>
    """
    
    send_smtp_email = SendSmtpEmail(
        to=[{"email": to_email, "name": name}],
        sender={"email": os.getenv("BREVO_SENDER"), "name": "SmartAttend"},
        subject=f"Welcome to SmartAttend, {name}!",
        html_content=html_content
    )
    
    try:
        api_instance = get_brevo_client()
        response = api_instance.send_transac_email(send_smtp_email)
        print(f"✅ Welcome email sent to {to_email}")
        return response
    except Exception as e:
        print(f"❌ Welcome email failed: {e}")
        return None

def send_login_alert(to_email: str, name: str, ip_address: str, user_agent: str):
    """Send login alert email for security"""
    
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="max-width: 600px; background: #f3f4f6; padding: 30px; border-radius: 16px;">
            <h2 style="color: #4c1d95;">🔐 New Login to Your Account</h2>
            <p>Hello {name},</p>
            <p>We detected a login to your SmartAttend account.</p>
            <div style="background: white; padding: 15px; border-radius: 12px; margin: 20px 0;">
                <p><strong>📍 IP Address:</strong> {ip_address}</p>
                <p><strong>💻 Device/Browser:</strong> {user_agent}</p>
                <p><strong>⏰ Time:</strong> {current_time}</p>
            </div>
            <p>If this was you, you can ignore this email.</p>
            <p style="color: red; font-weight: bold;">⚠️ If this wasn't you, please reset your password immediately.</p>
            <hr>
            <p style="font-size: 12px;">SmartAttend - Digital Attendance via Face Recognition</p>
        </div>
    </body>
    </html>
    """
    
    send_smtp_email = SendSmtpEmail(
        to=[{"email": to_email, "name": name}],
        sender={"email": os.getenv("BREVO_SENDER"), "name": "SmartAttend Security"},
        subject=f"🔐 Login Alert - SmartAttend",
        html_content=html_content
    )
    
    try:
        api_instance = get_brevo_client()
        response = api_instance.send_transac_email(send_smtp_email)
        print(f"✅ Login alert sent to {to_email}")
        return response
    except Exception as e:
        print(f"❌ Login alert failed: {e}")
        return None

def send_password_reset_email(to_email: str, name: str, reset_token: str):
    """Send password reset email"""
    
    reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="max-width: 600px; background: #f3f4f6; padding: 30px; border-radius: 16px;">
            <h2 style="color: #4c1d95;">🔐 Password Reset Request</h2>
            <p>Hello {name},</p>
            <p>We received a request to reset your password.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" 
                   style="background: #4c1d95; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                   Reset Password
                </a>
            </div>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr>
            <p style="font-size: 12px;">SmartAttend - Digital Attendance via Face Recognition</p>
        </div>
    </body>
    </html>
    """
    
    send_smtp_email = SendSmtpEmail(
        to=[{"email": to_email, "name": name}],
        sender={"email": os.getenv("BREVO_SENDER"), "name": "SmartAttend Security"},
        subject=f"Password Reset Request - SmartAttend",
        html_content=html_content
    )
    
    try:
        api_instance = get_brevo_client()
        response = api_instance.send_transac_email(send_smtp_email)
        print(f"✅ Password reset email sent to {to_email}")
        return response
    except Exception as e:
        print(f"❌ Password reset email failed: {e}")
        return None