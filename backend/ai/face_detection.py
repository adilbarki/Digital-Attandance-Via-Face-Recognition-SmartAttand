import cv2
import numpy as np
import os
from datetime import datetime

class FaceDetector:
    def __init__(self):
        # Load Haar Cascade for face detection
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        # Alternative: Use DNN for better accuracy
        self.use_dnn = False
        
    def detect_faces(self, image):
        """Detect faces in an image"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60)
        )
        return faces
    
    def draw_faces(self, image, faces):
        """Draw rectangles around detected faces"""
        for (x, y, w, h) in faces:
            cv2.rectangle(image, (x, y), (x+w, y+h), (0, 255, 0), 2)
            cv2.putText(image, "Face", (x, y-10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        return image
    
    def get_face_count(self, image):
        """Return number of faces detected"""
        faces = self.detect_faces(image)
        return len(faces)
    
    def extract_face_region(self, image, face):
        """Extract the face region from image"""
        (x, y, w, h) = face
        return image[y:y+h, x:x+w]

# Test function
def test_face_detection():
    detector = FaceDetector()
    
    # Open webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Camera not accessible")
        return
    
    print("✅ Camera opened successfully")
    print("🎯 Face Detection Started...")
    print("Press 'q' to quit | Press 's' to save snapshot")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Detect faces
        faces = detector.detect_faces(frame)
        frame = detector.draw_faces(frame, faces)
        
        # Display info
        cv2.putText(frame, f"Faces Detected: {len(faces)}", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(frame, "Press 'q' to quit", (10, 70),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        cv2.imshow('Face Detection Test', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            cv2.imwrite(f"face_snapshot_{timestamp}.jpg", frame)
            print(f"✅ Snapshot saved: face_snapshot_{timestamp}.jpg")
    
    cap.release()
    cv2.destroyAllWindows()
    print("👋 Face Detection stopped")

if __name__ == "__main__":
    test_face_detection()