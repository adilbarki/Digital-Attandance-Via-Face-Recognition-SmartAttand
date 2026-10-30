from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.utils.db import connect_to_mongo, close_mongo_connection
from app.routes import auth  # ← Import
from app.routes import test
from app.routes import auth, class_routes, student_routes,  attendance_routes, contact_routes, public_routes
from app.routes import reports
from app.routes import reports_pdf
from app.routes import admin_routes
from app.routes import accuracy
from app.routes import search_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    print("🚀 SmartAttend Backend Started")
    yield
    await close_mongo_connection()
    print("👋 SmartAttend Backend Shutdown")

app = FastAPI(
    title="SmartAttend API",
    description="Face Recognition Attendance System",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Add DELETE
    allow_headers=["*"],
)

# ✅ REGISTER ROUTES - YEH LINE IMPORTANT HAI
app.include_router(auth.router)
app.include_router(test.router)
app.include_router(auth.router)
app.include_router(class_routes.router)
app.include_router(student_routes.router)
app.include_router(attendance_routes.router)
app.include_router(reports.router)
app.include_router(reports_pdf.router)
app.include_router(admin_routes.router)
app.include_router(accuracy.router)
app.include_router(accuracy.router, prefix="/api/accuracy", tags=["Accuracy"])
app.include_router(search_routes.router)
app.include_router(contact_routes.router)     # ✅ NEW
app.include_router(public_routes.router) 

@app.get("/")
async def root():
    return {
        "message": "SmartAttend API is running!",
        "version": "1.0.0",
        "status": "active"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "run:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )