import cv2
import pickle
import sqlite3
from datetime import datetime
import os

class RealTimeAttendance:
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.recognizer = cv2.face.LBPHFaceRecognizer_create()
        self.labels = {}
        self.load_model()
        self.setup_database()
        self.detection_buffer = {}  # For 3-time detection logic
        
    def load_model(self):
        model_path = "face_data/encodings/opencv_trainer_fairface.yml"
        labels_path = "face_data/encodings/labels_fairface.pkl"
        
        if os.path.exists(model_path) and os.path.exists(labels_path):
            self.recognizer.read(model_path)
            with open(labels_path, 'rb') as f:
                self.labels = pickle.load(f)
            print(f"✅ Model loaded: {len(self.labels)} persons")
        else:
            print("❌ Model not found. Train first")
            
    def setup_database(self):
        self.conn = sqlite3.connect('attendance.db')
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS attendance_realtime (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_name TEXT,
                student_id TEXT,
                date TEXT,
                time TEXT,
                confidence INTEGER
            )
        ''')
        self.conn.commit()
        print("✅ Database ready")
        
    def mark_attendance(self, student_name, student_id, confidence):
        today = datetime.now().strftime("%Y-%m-%d")
        current_time = datetime.now().strftime("%H:%M:%S")
        
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT * FROM attendance_realtime 
            WHERE student_name = ? AND date = ?
        ''', (student_name, today))
        
        if cursor.fetchone() is None:
            cursor.execute('''
                INSERT INTO attendance_realtime (student_name, student_id, date, time, confidence)
                VALUES (?, ?, ?, ?, ?)
            ''', (student_name, student_id, today, current_time, confidence))
            self.conn.commit()
            print(f"✅ Marked: {student_name} at {current_time} (Confidence: {confidence:.0f})")
            return True
        return False
        
    def run(self):
        cap = cv2.VideoCapture(0)
        marked_students = set()
        
        print("="*50)
        print("🎯 Real-Time Attendance System Started")
        print("   Threshold: 60 | Detection required: 3 times")
        print("   Press 'q' to quit")
        print("   Press 'r' to reset today's marked list")
        print("="*50)
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
            
            for (x, y, w, h) in faces:
                roi = gray[y:y+h, x:x+w]
                roi = cv2.resize(roi, (200, 200))
                
                label, confidence = self.recognizer.predict(roi)
                
                # THRESHOLD 60 - Strict but not too strict
                if confidence < 60:
                    name = self.labels.get(label, "Unknown")
                    student_id = name
                    color = (0, 255, 0)
                    status = "✅ KNOWN"
                    
                    # 3-TIME DETECTION LOGIC
                    if name in self.detection_buffer:
                        self.detection_buffer[name] += 1
                    else:
                        self.detection_buffer[name] = 1
                    
                    # Mark attendance only after 3 consecutive detections
                    if self.detection_buffer[name] >= 3 and name not in marked_students:
                        if name != "Unknown":
                            self.mark_attendance(name, student_id, confidence)
                            marked_students.add(name)
                            print(f"   📝 {name} detected {self.detection_buffer[name]} times - Attendance marked")
                    else:
                        if self.detection_buffer[name] < 3:
                            print(f"   ⏳ {name} detected {self.detection_buffer[name]}/3 times - waiting...")
                else:
                    name = "Unknown"
                    student_id = ""
                    color = (0, 0, 255)
                    status = "❌ UNKNOWN"
                    # Reset buffer if unknown detected
                    self.detection_buffer.clear()
                
                # Display on frame
                cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
                
                # Show name and confidence
                if confidence < 65:
                    label_text = f"{name} ({confidence:.0f})"
                else:
                    label_text = f"Unknown ({confidence:.0f})"
                cv2.putText(frame, label_text, (x, y-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                cv2.putText(frame, status, (x, y+h+20),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                
                # Show detection count
                if name != "Unknown" and name in self.detection_buffer:
                    count_text = f"Detections: {self.detection_buffer[name]}/3"
                    cv2.putText(frame, count_text, (x, y+h+40),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
            
            # Display info on frame
            cv2.putText(frame, f"Present Today: {len(marked_students)}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, "Press 'q': Quit | 'r': Reset", (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            cv2.putText(frame, f"Threshold: 60 | Need 3 detections", (10, 85),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            cv2.imshow('SmartAttend - Real Time Attendance', frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('r'):
                marked_students.clear()
                self.detection_buffer.clear()
                print("🔄 Reset today's marked list and detection buffer")
        
        cap.release()
        cv2.destroyAllWindows()
        
        # Show final report
        self.show_report()
        
    def show_report(self):
        cursor = self.conn.cursor()
        today = datetime.now().strftime("%Y-%m-%d")
        cursor.execute('''
            SELECT student_name, time, confidence FROM attendance_realtime 
            WHERE date = ? ORDER BY time
        ''', (today,))
        records = cursor.fetchall()
        
        print("\n" + "="*50)
        print(f"📊 ATTENDANCE REPORT - {today}")
        print("="*50)
        if records:
            for name, time, conf in records:
                print(f"  ✅ {name} - {time} (conf: {conf:.0f})")
            print(f"\nTotal Present: {len(records)}")
        else:
            print("  No attendance records today")
        print("="*50)
        
    def close(self):
        self.conn.close()

if __name__ == "__main__":
    system = RealTimeAttendance()
    try:
        system.run()
    except KeyboardInterrupt:
        print("\n👋 System stopped by user")
    finally:
        system.close()