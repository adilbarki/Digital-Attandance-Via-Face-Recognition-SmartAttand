import cv2
import pickle
import numpy as np
import os

# Load model and labels
def load_model():
    model_path = "face_data/encodings/opencv_trainer.yml"
    labels_path = "face_data/encodings/labels.pkl"
    
    if not os.path.exists(model_path):
        print(f"❌ Model not found: {model_path}")
        print("Please run train_opencv.py first")
        return None, None
    
    if not os.path.exists(labels_path):
        print(f"❌ Labels not found: {labels_path}")
        return None, None
    
    recognizer = cv2.face.LBPHFaceRecognizer_create() 
    recognizer.read(model_path)
    
    with open(labels_path, 'rb') as f:
        labels = pickle.load(f)
    
    print(f"✅ Model loaded successfully!")
    print(f"✅ Total trained persons: {len(labels)}")
    print(f"   Labels: {labels}")
    
    return recognizer, labels

# Test recognition on webcam
def test_webcam():
    recognizer, labels = load_model()
    if recognizer is None:
        return
    
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Camera not accessible")
        return
    
    print("\n🎯 Starting Face Recognition Test...")
    print("   Press 'q' to quit")
    print("   Press 's' to save snapshot")
    
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        for (x, y, w, h) in faces:
            # Extract face ROI
            roi = gray[y:y+h, x:x+w]
            
            # Recognize face
            label, confidence = recognizer.predict(roi)
            name = labels.get(label, "Unknown")
            
            # Confidence threshold (lower is better for LBPH)
            # Typical: < 100 good, > 150 poor
            if confidence < 100:
                color = (0, 255, 0)  # Green - Recognized
                status = "KNOWN"
            else:
                color = (0, 0, 255)  # Red - Unknown
                status = "UNKNOWN"
                name = "Unknown"
            
            # Draw rectangle and label
            cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
            
            # Display name and confidence
            label_text = f"{name} ({int(confidence)})"
            cv2.putText(frame, label_text, (x, y-10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            
            # Display status
            cv2.putText(frame, status, (x, y+h+20),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        # Display info on frame
        cv2.putText(frame, f"Faces Found: {len(faces)}", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(frame, "Press 'q' to quit", (10, 60),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, "Press 's' to save snapshot", (10, 80),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Show frame
        cv2.imshow('Face Recognition Test', frame)
        
        # Handle key presses
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            timestamp = cv2.getTickCount()
            filename = f"recognition_test_{timestamp}.jpg"
            cv2.imwrite(filename, frame)
            print(f"✅ Snapshot saved: {filename}")
    
    cap.release()
    cv2.destroyAllWindows()
    print("\n👋 Test completed!")

# Test on a single image
def test_image(image_path):
    recognizer, labels = load_model()
    if recognizer is None:
        return
    
    if not os.path.exists(image_path):
        print(f"❌ Image not found: {image_path}")
        return
    
    # Load image
    image = cv2.imread(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    for (x, y, w, h) in faces:
        roi = gray[y:y+h, x:x+w]
        label, confidence = recognizer.predict(roi)
        name = labels.get(label, "Unknown")
        
        color = (0, 255, 0) if confidence < 100 else (0, 0, 255)
        cv2.rectangle(image, (x, y), (x+w, y+h), color, 2)
        cv2.putText(image, f"{name} ({int(confidence)})", (x, y-10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    
    # Show result
    cv2.imshow('Recognition Result', image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

if __name__ == "__main__":
    print("=" * 50)
    print("🎯 Face Recognition Test")
    print("=" * 50)
    print("1. Test on Webcam")
    print("2. Test on Image")
    
    choice = input("Enter choice (1 or 2): ")
    
    if choice == '1':
        test_webcam()
    elif choice == '2':
        img_path = input("Enter image path: ")
        test_image(img_path)
    else:
        print("❌ Invalid choice")