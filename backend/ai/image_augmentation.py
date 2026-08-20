import cv2
import numpy as np
import imgaug.augmenters as iaa
import os

def augment_image(image_path, output_dir, student_roll, num_augmentations=5):
    """
    Generate augmented images from a single image
    
    Args:
        image_path: Path to original image
        output_dir: Directory to save augmented images
        student_roll: Student roll number for naming
        num_augmentations: Number of augmented images to generate
    
    Returns:
        List of saved image paths
    """
    try:
        # Read image
        img = cv2.imread(image_path)
        if img is None:
            print(f"❌ Could not read image: {image_path}")
            return []
        
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Define augmentation sequence
        seq = iaa.Sequential([
            iaa.Fliplr(0.5),  # Horizontal flip
            iaa.Affine(
                rotate=(-15, 15),  # Rotation
                scale=(0.85, 1.15),  # Zoom in/out
                translate_percent=(-0.1, 0.1)  # Shift
            ),
            iaa.Multiply((0.7, 1.3)),  # Brightness
            iaa.GaussianBlur(sigma=(0.0, 0.5)),  # Blur
            iaa.AddToHueAndSaturation((-15, 15))  # Color variation
        ])
        
        # Generate augmented images
        augmented_images = seq(images=[img] * num_augmentations)
        
        # Save images
        saved_paths = []
        for i, aug_img in enumerate(augmented_images):
            aug_img = cv2.cvtColor(aug_img, cv2.COLOR_RGB2BGR)
            filename = f"{student_roll}_aug_{i+1}.jpg"
            save_path = os.path.join(output_dir, filename)
            cv2.imwrite(save_path, aug_img)
            saved_paths.append(save_path)
        
        print(f"✅ Generated {len(saved_paths)} augmented images for student: {student_roll}")
        return saved_paths
        
    except Exception as e:
        print(f"❌ Augmentation failed for {student_roll}: {e}")
        return []