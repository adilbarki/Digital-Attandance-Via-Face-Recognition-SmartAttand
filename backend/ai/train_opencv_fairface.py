import cv2
import os
import numpy as np
import pickle

def train_fairface():
    # Multiple dataset paths
    dataset_paths = [
        "face_data/dataset_fairface",
        "face_data/dataset_fairface/archive"
    ]
    
    model_path = "face_data/encodings/opencv_trainer_fairface.yml"
    labels_path = "face_data/encodings/labels_fairface.pkl"
    
    faces = []
    labels = []
    label_dict = {}
    current_label = 0
    
    print("📸 Training with OpenCV LBPH...")
    print(f"Looking in: {dataset_paths}")
    
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    # Loop through all dataset paths
    for dataset_path in dataset_paths:
        if not os.path.exists(dataset_path):
            print(f"⚠️ Path not found: {dataset_path}")
            continue
            
        print(f"\n📁 Scanning: {dataset_path}")
        
        for person_name in os.listdir(dataset_path):
            person_path = os.path.join(dataset_path, person_name)
            
            if not os.path.isdir(person_path):
                continue
            
            # Skip if already processed
            if person_name in label_dict.values():
                continue
                
            label_dict[current_label] = person_name
            print(f"\n👤 Processing: {person_name} (label: {current_label})")
            
            image_count = 0
            for image_file in os.listdir(person_path):
                if image_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                    image_path = os.path.join(person_path, image_file)
                    
                    img = cv2.imread(image_path)
                    if img is None:
                        continue
                        
                    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    faces_detected = face_cascade.detectMultiScale(gray, 1.3, 5)
                    
                    for (x, y, w, h) in faces_detected:
                        face_roi = gray[y:y+h, x:x+w]
                        face_roi = cv2.resize(face_roi, (200, 200))
                        faces.append(face_roi)
                        labels.append(current_label)
                        image_count += 1
                        print(f"  ✅ Face {image_count}: {image_file}")
            
            if image_count > 0:
                current_label += 1
            else:
                print(f"  ⚠️ No faces found in {person_name}")
    
    if len(faces) > 0:
        recognizer = cv2.face.LBPHFaceRecognizer_create()
        recognizer.train(faces, np.array(labels))
        recognizer.save(model_path)
        
        with open(labels_path, 'wb') as f:
            pickle.dump(label_dict, f)
        
        print("\n" + "="*50)
        print("✅ Training Complete!")
        print(f"   Total faces: {len(faces)}")
        print(f"   Total persons: {len(label_dict)}")
        print(f"   Model saved to: {model_path}")
        print("="*50)
        
        # Print all trained persons
        print("\n📋 Trained persons:")
        for label, name in label_dict.items():
            print(f"   {label}: {name}")
    else:
        print("\n❌ No faces detected!")

if __name__ == "__main__":
    train_fairface()