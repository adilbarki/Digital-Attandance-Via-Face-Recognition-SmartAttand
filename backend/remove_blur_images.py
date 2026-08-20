import cv2
import os
import shutil
from pathlib import Path

def is_blurry(image_path, threshold=80):
    """
    Check if image is blurry using Laplacian variance
    Lower threshold = stricter (more images marked as blurry)
    Higher threshold = lenient (fewer images marked as blurry)
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return True
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        return variance < threshold
    except:
        return True

def remove_blurry_images(dataset_path, blurry_backup_path, threshold=80):
    """
    Remove blurry images from dataset and move to backup folder
    """
    # Create backup folder
    os.makedirs(blurry_backup_path, exist_ok=True)
    
    total_removed = 0
    total_checked = 0
    
    print("=" * 60)
    print("🔍 Scanning for blurry images...")
    print(f"   Dataset: {dataset_path}")
    print(f"   Threshold: {threshold} (lower = stricter)")
    print("=" * 60)
    
    for person_name in os.listdir(dataset_path):
        person_path = os.path.join(dataset_path, person_name)
        
        if not os.path.isdir(person_path):
            continue
        
        print(f"\n📁 Checking: {person_name}")
        
        for img_file in os.listdir(person_path):
            if not img_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                continue
            
            img_path = os.path.join(person_path, img_file)
            total_checked += 1
            
            if is_blurry(img_path, threshold):
                # Move to backup
                backup_path = os.path.join(blurry_backup_path, f"{person_name}_{img_file}")
                shutil.move(img_path, backup_path)
                total_removed += 1
                print(f"   ❌ Removed (blurry): {img_file}")
            else:
                if total_checked % 100 == 0:
                    print(f"   ✅ Kept: {img_file}")
    
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    print(f"   Total images checked: {total_checked}")
    print(f"   Blurry images removed: {total_removed}")
    print(f"   Clear images remaining: {total_checked - total_removed}")
    print(f"   Backup location: {blurry_backup_path}")
    print("=" * 60)
    
    return total_removed

def restore_blurry_images(blurry_backup_path, dataset_path):
    """
    Restore blurry images from backup (if needed)
    """
    print("=" * 60)
    print("🔄 Restoring blurry images...")
    print("=" * 60)
    
    restored = 0
    for backup_file in os.listdir(blurry_backup_path):
        # Extract original person name from filename
        parts = backup_file.split('_')
        if len(parts) >= 2:
            person_name = parts[0]
            person_path = os.path.join(dataset_path, person_name)
            os.makedirs(person_path, exist_ok=True)
            
            backup_path = os.path.join(blurry_backup_path, backup_file)
            dest_path = os.path.join(person_path, backup_file.split('_', 1)[1])
            shutil.move(backup_path, dest_path)
            restored += 1
            print(f"   ✅ Restored: {backup_file}")
    
    print(f"\n✅ Restored {restored} images")
    return restored

if __name__ == "__main__":
    DATASET_PATH = "face_data/dataset_fairface"
    BACKUP_PATH = "face_data/blurry_backup"
    
    print("\n🎯 FACE IMAGE BLUR REMOVAL TOOL")
    print("=" * 60)
    print("1. Remove blurry images from dataset")
    print("2. Restore blurry images from backup")
    print("3. Test single image (check if blurry)")
    print("=" * 60)
    
    choice = input("Enter your choice (1/2/3): ").strip()
    
    if choice == '1':
        threshold = input("Enter threshold (default 80, lower=stricter): ").strip()
        threshold = int(threshold) if threshold else 80
        remove_blurry_images(DATASET_PATH, BACKUP_PATH, threshold)
        
    elif choice == '2':
        restore_blurry_images(BACKUP_PATH, DATASET_PATH)
        
    elif choice == '3':
        img_path = input("Enter image path: ").strip()
        if os.path.exists(img_path):
            variance = cv2.Laplacian(cv2.cvtColor(cv2.imread(img_path), cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
            print(f"📊 Blur score: {variance:.2f}")
            if variance < 80:
                print("❌ Image is BLURRY")
            else:
                print("✅ Image is CLEAR")
        else:
            print("❌ Image not found")
    
    else:
        print("Invalid choice!")