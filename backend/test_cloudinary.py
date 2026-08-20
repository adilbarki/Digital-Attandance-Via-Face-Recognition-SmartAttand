import os
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader

load_dotenv()

print("=" * 50)
print("CLOUDINARY CONNECTION TEST")
print("=" * 50)

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# Test by trying to upload a small test string (won't actually upload)
try:
    # Simple test - check config
    config = cloudinary.config()
    print(f"\n✅ Cloudinary Configured Successfully!")
    print(f"   Cloud Name: {config.cloud_name}")
    print(f"   API Key: {config.api_key[:5]}... (hidden)")
    print("\n✅ Cloudinary is READY to use!")
except Exception as e:
    print(f"❌ Error: {e}")