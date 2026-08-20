from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings
import certifi

class MongoDB:
    client: AsyncIOMotorClient = None
    database = None

mongodb = MongoDB()

async def connect_to_mongo():
    try:
        mongodb.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            tls=True,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=30000
        )
        mongodb.database = mongodb.client[settings.DATABASE_NAME]
        await mongodb.client.admin.command('ping')
        print("✅ Connected to MongoDB Atlas - digital_attendance")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")

async def close_mongo_connection():
    if mongodb.client:
        mongodb.client.close()
        print("Disconnected from MongoDB")

def get_database():
    return mongodb.database