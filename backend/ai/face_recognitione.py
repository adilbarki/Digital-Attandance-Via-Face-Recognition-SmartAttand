import cv2
import numpy as np
import pickle
import os
from datetime import datetime
import face_recognition

class FaceRecognizer:
    def __init__(self, model_path="face_data/encodings/encodings.pkl"):
        self.model_path = model_path
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        self.load_encodings()
        
    def load_encodings(self):
        """Load saved face encodings from file"""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    data = pickle.load(f)
                    self.known_face_encodings = data['encodings']
                    self.known_face_names = data['names']
                    self.known_face_ids = data.get('ids', [])
                print(f"✅ Loaded {len(self.known_face_names)} face encodings")
            except Exception as e:
                print(f"❌ Error loading encodings: {e}")
        else:
            print("⚠️ No saved encodings found. Train the model first.")
    
    def save_encodings(self):
        """Save face encodings to file"""
        import os
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump({
                'encodings': self.known_face_encodings,
                'names': self.known_face_names,
                'ids': self.known_face_ids
            }, f)
        print(f"✅ Saved {len(self.known_face_names)} face encodings")
    
    def add_face(self, image_path, name, student_id):
        """Add a new face to the recognizer"""
        try:
            image = face_recognition.load_image_file(image_path)
            encodings = face_recognition.face_encodings(image)
            
            if len(encodings) > 0:
                self.known_face_encodings.append(encodings[0])
                self.known_face_names.append(name)
                self.known_face_ids.append(student_id)
                self.save_encodings()
                return True
            else:
                print(f"❌ No face found in {image_path}")
                return False
        except Exception as e:
            print(f"❌ Error adding face: {e}")
            return False
    
    def recognize_face(self, face_encoding, tolerance=0.6):
        """Recognize a single face encoding"""
        if len(self.known_face_encodings) == 0:
            return None, None, 0
        
        # Compare with known faces
        distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
        best_match_index = np.argmin(distances)
        
        if distances[best_match_index] < tolerance:
            return (self.known_face_names[best_match_index], 
                    self.known_face_ids[best_match_index],
                    1 - distances[best_match_index])
        return None, None, 0
    
    def recognize_frame(self, frame, tolerance=0.6):
        """Recognize all faces in a frame"""
        # Resize frame for faster processing
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        # Find faces
        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
        
        results = []
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # Scale back up
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4
            
            name, student_id, confidence = self.recognize_face(face_encoding, tolerance)
            
            results.append({
                'location': (top, right, bottom, left),
                'name': name or "Unknown",
                'student_id': student_id,
                'confidence': confidence
            })
        
        return results

# Test function
def test_face_recognition():
    recognizer = FaceRecognizer()
    
    # Open webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Camera not accessible")
        return
    
    print("✅ Camera opened")
    print("🎯 Face Recognition Started...")
    print("Press 'q' to quit")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Recognize faces
        results = recognizer.recognize_frame(frame)
        
        # Draw results
        for result in results:
            top, right, bottom, left = result['location']
            name = result['name']
            confidence = result['confidence']
            
            # Set color based on recognition
            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            
            # Draw rectangle
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            
            # Draw label
            label = f"{name} ({confidence:.2f})" if confidence > 0 else "Unknown"
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
            cv2.putText(frame, label, (left + 6, bottom - 6),
                       cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1)
        
        cv2.imshow('Face Recognition Test', frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    test_face_recognition()