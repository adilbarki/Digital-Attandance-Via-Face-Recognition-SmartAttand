import cv2
import face_recognition
import pickle
import sqlite3
from datetime import datetime
import os
import numpy as np
import asyncio
from app.utils.db import get_database

class AdvancedAttendanceSystem:
    def __init__(self):
        self.known_encodings = []
        self.known_names = []  # Stores roll_numbers
        self.load_model()
        self.setup_database()
        self.detection_buffer = {}
        
    def load_model(self):
        model_path = "face_data/encodings/face_recognition_model.pkl"
        
        if os.path.exists(model_path):
            with open(model_path, 'rb') as f:
                data = pickle.load(f)
                self.known_encodings = data['encodings']
                self.known_names = data['names']  # These are roll_numbers
            print(f"✅ Model loaded: {len(self.known_names)} persons")
            print(f"📋 Roll numbers in model: {self.known_names}")
        else:
            print("❌ Model not found. Run train_face_recognition.py first")
            
    def setup_database(self):
        self.conn = sqlite3.connect('attendance.db')
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS attendance_advanced (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_name TEXT,
                roll_number TEXT,
                date TEXT,
                time TEXT,
                confidence REAL
            )
        ''')
        self.conn.commit()
        print("✅ Database ready")
    
    def get_student_by_roll_number(self, roll_number):
        """Get student name from MongoDB using roll_number"""
        try:
            # Try to get from MongoDB
            import asyncio
            from motor.motor_asyncio import AsyncIOMotorClient
            from app.config.settings import settings
            
            async def fetch_student():
                client = AsyncIOMotorClient(settings.MONGODB_URL)
                db = client[settings.DATABASE_NAME]
                student = await db.students.find_one({"roll_number": roll_number})
                client.close()
                return student
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            student = loop.run_until_complete(fetch_student())
            loop.close()
            
            if student:
                return student.get("name", roll_number)
            return roll_number
        except Exception as e:
            print(f"⚠️ Error fetching student name: {e}")
            return roll_number
        
    def recognize_face(self, face_encoding):
        """Recognize face and return roll_number, name, confidence"""
        if not self.known_encodings:
            return None, None, 0
        
        distances = face_recognition.face_distance(self.known_encodings, face_encoding)
        best_match_index = np.argmin(distances)
        
        if distances[best_match_index] < 0.45:
            roll_number = self.known_names[best_match_index]
            confidence = 1 - distances[best_match_index]
            
            # Get student name using roll_number
            name = self.get_student_by_roll_number(roll_number)
            return roll_number, name, confidence
        
        return None, None, 0
        
    def mark_attendance(self, roll_number, student_name, confidence):
        today = datetime.now().strftime("%Y-%m-%d")
        current_time = datetime.now().strftime("%H:%M:%S")
        
        cursor = self.conn.cursor()
        # Check by roll_number (primary key)
        cursor.execute('''
            SELECT * FROM attendance_advanced 
            WHERE roll_number = ? AND date = ?
        ''', (roll_number, today))
        
        if cursor.fetchone() is None:
            cursor.execute('''
                INSERT INTO attendance_advanced (student_name, roll_number, date, time, confidence)
                VALUES (?, ?, ?, ?, ?)
            ''', (student_name, roll_number, today, current_time, confidence))
            self.conn.commit()
            print(f"✅ Marked: {student_name} (Roll: {roll_number}) at {current_time}")
            return True
        return False
        
    def run(self):
        cap = cv2.VideoCapture(0)
        marked_students = set()
        
        print("\n" + "="*50)
        print("🎯 Advanced Face Recognition Attendance System")
        print("   Using Roll Number as Primary Key")
        print("   Press 'q' to quit | 'r' to reset")
        print("="*50 + "\n")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
            rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
            
            face_locations = face_recognition.face_locations(rgb_small_frame)
            face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
            
            for face_encoding in face_encodings:
                if self.known_encodings:
                    # Use the new recognize_face method
                    roll_number, student_name, confidence = self.recognize_face(face_encoding)
                    
                    if roll_number:
                        color = (0, 255, 0)
                        name_to_show = student_name
                        display_id = roll_number
                        
                        # 3-time detection logic
                        if roll_number in self.detection_buffer:
                            self.detection_buffer[roll_number] += 1
                        else:
                            self.detection_buffer[roll_number] = 1
                        
                        if self.detection_buffer[roll_number] >= 3 and roll_number not in marked_students:
                            self.mark_attendance(roll_number, student_name, confidence)
                            marked_students.add(roll_number)
                            print(f"📝 {student_name} (Roll: {roll_number}) - Detection count: {self.detection_buffer[roll_number]}")
                    else:
                        name_to_show = "Unknown"
                        display_id = ""
                        color = (0, 0, 255)
                else:
                    name_to_show = "Unknown"
                    display_id = ""
                    color = (0, 0, 255)
                
                if face_locations:
                    top, right, bottom, left = face_locations[0]
                    top *= 2
                    right *= 2
                    bottom *= 2
                    left *= 2
                    cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                    
                    # Display name and roll number
                    label = f"{name_to_show} ({display_id})" if display_id else name_to_show
                    cv2.putText(frame, label, (left, top-10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            
            cv2.putText(frame, f"Present: {len(marked_students)}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, "Press 'q' quit | 'r' reset", (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            cv2.imshow('Advanced Face Recognition', frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('r'):
                marked_students.clear()
                self.detection_buffer.clear()
                print("\n🔄 Reset - Ready for new session")
        
        cap.release()
        cv2.destroyAllWindows()
        self.show_report()
        
    def show_report(self):
        cursor = self.conn.cursor()
        today = datetime.now().strftime("%Y-%m-%d")
        cursor.execute('''
            SELECT student_name, roll_number, time, confidence FROM attendance_advanced 
            WHERE date = ? ORDER BY time
        ''', (today,))
        records = cursor.fetchall()
        
        print("\n" + "="*50)
        print(f"📊 ATTENDANCE REPORT - {today}")
        print("="*50)
        if records:
            for name, roll, time, conf in records:
                print(f"  ✅ {name} (Roll: {roll}) - {time} (conf: {conf:.2f})")
            print(f"\nTotal Present: {len(records)}")
        else:
            print("  No attendance records today")
        print("="*50)
        
    def close(self):
        if hasattr(self, 'conn'):
            self.conn.close()

if __name__ == "__main__":
    system = AdvancedAttendanceSystem()
    try:
        system.run()
    except KeyboardInterrupt:
        print("\n👋 System stopped by user")
    finally:
        system.close()

        