import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
db = client[os.getenv("DATABASE_NAME", "digital_attendance")]

async def fix():
    students = await db.students.find().to_list(None)
    print(f"Found {len(students)} students")
    
    updated = 0
    for student in students:
        if not student.get("user_id"):
            user = await db.users.find_one({"email": student.get("email")})
            if user:
                await db.students.update_one(
                    {"_id": student["_id"]},
                    {"$set": {"user_id": str(user["_id"])}}
                )
                updated += 1
                print(f"✅ Updated: {student.get('name')} -> {str(user['_id'])}")
    
    print(f"\n✅ Updated {updated} students")

asyncio.run(fix())