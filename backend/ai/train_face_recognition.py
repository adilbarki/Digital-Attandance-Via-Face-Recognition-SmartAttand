import face_recognition
import pickle
import os
import cv2

def train_face_recognition():
    dataset_path = "face_data/dataset_fairface"
    model_path = "face_data/encodings/face_recognition_model.pkl"
    
    known_encodings = []
    known_names = []
    
    print("📸 Training with Face Recognition Library...")
    print(f"Dataset: {dataset_path}")
    
    for folder_name in os.listdir(dataset_path):
        folder_path = os.path.join(dataset_path, folder_name)
        
        if not os.path.isdir(folder_path):
            continue
        
        print(f"\n👤 Processing: {folder_name}")
        person_encodings = []
        
        for image_file in os.listdir(folder_path):
            if image_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                image_path = os.path.join(folder_path, image_file)
                
                try:
                    # Load image and get face encoding
                    image = face_recognition.load_image_file(image_path)
                    encodings = face_recognition.face_encodings(image)
                    
                    if encodings:
                        person_encodings.append(encodings[0])
                        print(f"  ✅ Encoding generated: {image_file}")
                    else:
                        print(f"  ❌ No face found: {image_file}")
                except Exception as e:
                    print(f"  ❌ Error: {e}")
        
        if person_encodings:
            # Take average of multiple encodings for better accuracy
            avg_encoding = [sum(x)/len(person_encodings) for x in zip(*person_encodings)]
            known_encodings.append(avg_encoding)
            known_names.append(folder_name)  # ✅ folder_name = roll_number
            print(f"  📊 Total valid images: {len(person_encodings)}")
    
    if known_encodings:
        # Save model
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        with open(model_path, 'wb') as f:
            pickle.dump({
                'encodings': known_encodings,
                'names': known_names
            }, f)
        
        print("\n" + "="*50)
        print("✅ Training Complete!")
        print(f"   Total persons: {len(known_names)}")
        print(f"   Roll numbers: {known_names}")
        print(f"   Model saved to: {model_path}")
        print("="*50)
        
        # Print all trained persons
        print("\n📋 Trained Roll Numbers:")
        for name in known_names:
            print(f"   ✅ {name}")
    else:
        print("\n❌ No faces found!")

# ✅ Add this function for incremental training
def incremental_train(student_roll_number: str, image_path: str):
    """Train model incrementally when new student photo is added"""
    import pickle
    import face_recognition
    import os
    
    print(f"🔄 Incremental training started for roll number: {student_roll_number}")
    print(f"📸 Image path: {image_path}")
    
    model_path = "face_data/encodings/face_recognition_model.pkl"
    
    # Load existing model
    if os.path.exists(model_path):
        with open(model_path, 'rb') as f:
            data = pickle.load(f)
            known_encodings = data['encodings']
            known_names = data['names']
        print(f"📚 Loaded existing model with {len(known_names)} students")
    else:
        known_encodings = []
        known_names = []
        print("📚 Creating new model")
    
    # Extract face encoding from new image
    image = face_recognition.load_image_file(image_path)
    face_locations = face_recognition.face_locations(image)
    encodings = face_recognition.face_encodings(image, face_locations)
    
    if encodings:
        # ✅ Use roll_number as identifier
        if student_roll_number in known_names:
            idx = known_names.index(student_roll_number)
            known_encodings[idx] = encodings[0]
            print(f"🔄 Updated encoding for existing student: {student_roll_number}")
        else:
            known_encodings.append(encodings[0])
            known_names.append(student_roll_number)
            print(f"✅ Added new student: {student_roll_number}")
        
        # Save updated model
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        with open(model_path, 'wb') as f:
            pickle.dump({'encodings': known_encodings, 'names': known_names}, f)
        print(f"💾 Model saved. Total students in model: {len(known_names)}")
        print(f"📋 Roll numbers in model: {known_names}")
        return True
    else:
        print(f"❌ No face detected in image for student: {student_roll_number}")
        print(f"   Face locations found: {len(face_locations)}")
        return False

if __name__ == "__main__":
    train_face_recognition()