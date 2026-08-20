from fastapi import APIRouter
from app.utils.db import get_database

router = APIRouter(prefix="/test", tags=["Test"])

@router.get("/db")
async def test_db():
    try:
        db = get_database()
        await db.command("ping")
        return {"status": "Database connected successfully"}
    except Exception as e:
        return {"status": "Database connection failed", "error": str(e)}