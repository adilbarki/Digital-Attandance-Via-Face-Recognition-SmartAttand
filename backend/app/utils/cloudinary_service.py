import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv
from datetime import datetime 

load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

print("✅ Cloudinary configured successfully!")


def upload_image_to_cloudinary(image_path, student_roll_no):
    """Upload image to Cloudinary and return URL"""
    try:
        upload_result = cloudinary.uploader.upload(
            image_path,
            folder="smartattend/students",
            public_id=f"student_{student_roll_no}_{int(datetime.now().timestamp())}",
            overwrite=True
        )
        return upload_result.get('secure_url')
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return None

def delete_image_from_cloudinary(public_id):
    """Delete image from Cloudinary"""
    try:
        cloudinary.uploader.destroy(public_id)
        return True
    except Exception as e:
        print(f"Cloudinary delete error: {e}")
        return False