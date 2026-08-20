import pandas as pd
import os
import shutil

# Paths
FAIRFACE_DIR = "fairface_data"
IMAGES_BASE = os.path.join(FAIRFACE_DIR, "fairface-img-margin025-trainval")
OUTPUT_DIR = "face_data/dataset_fairface"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("📂 Loading FairFace labels...")

# Load labels
train_labels = pd.read_csv(os.path.join(FAIRFACE_DIR, "fairface_label_train.csv"))
val_labels = pd.read_csv(os.path.join(FAIRFACE_DIR, "fairface_label_val.csv"))

# Check column names
print("Column names in train_labels:", list(train_labels.columns))
print("Column names in val_labels:", list(val_labels.columns))

# Combine
all_labels = pd.concat([train_labels, val_labels], ignore_index=True)

print(f"✅ Total images: {len(all_labels)}")

# Filter Indian faces
indian_faces = all_labels[all_labels['race'] == 'Indian']
print(f"🇮🇳 Indian faces found: {len(indian_faces)}")

# Select 2500 images
selected = indian_faces.sample(n=min(2500, len(indian_faces)), random_state=42)
print(f"Selected: {len(selected)} images")

print("\n📁 Copying images...")
copied = 0

for idx, row in selected.iterrows():
    img_file = row['file']
    gender = row['gender']
    
    # Use 'user_id' if exists, otherwise use index
    if 'user_id' in row:
        person_id = row['user_id']
    else:
        person_id = f"person_{idx}"
    
    person_name = f"{gender}_{person_id}"
    person_dir = os.path.join(OUTPUT_DIR, person_name)
    os.makedirs(person_dir, exist_ok=True)
    
    # Find image
    img_path = os.path.join(IMAGES_BASE, img_file)
    
    if os.path.exists(img_path):
        dest_path = os.path.join(person_dir, os.path.basename(img_file))
        shutil.copy(img_path, dest_path)
        copied += 1
        
        if copied % 100 == 0:
            print(f"  Copied {copied} images...")
    else:
        # Try train/val folders
        alt_path = os.path.join(IMAGES_BASE, "train", os.path.basename(img_file))
        if os.path.exists(alt_path):
            dest_path = os.path.join(person_dir, os.path.basename(img_file))
            shutil.copy(alt_path, dest_path)
            copied += 1

print(f"\n✅ Done! Copied: {copied} images")
print(f"Output folder: {OUTPUT_DIR}")