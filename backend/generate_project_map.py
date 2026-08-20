import os
import json

def get_file_description(filepath, filename):
    """Generate description based on file name and location"""
    file_lower = filename.lower()
    path_lower = filepath.lower()
    
    # Backend descriptions
    if "routes" in path_lower:
        if "auth" in file_lower:
            return "🔐 Authentication APIs (login, signup, JWT token)"
        elif "student" in file_lower:
            return "👨‍🎓 Student management APIs (CRUD operations)"
        elif "teacher" in file_lower:
            return "👨‍🏫 Teacher management APIs"
        elif "class" in file_lower:
            return "📚 Class management APIs (create, update, delete)"
        elif "attendance" in file_lower:
            return "📅 Attendance marking and tracking APIs"
        elif "admin" in file_lower:
            return "🛡️ Admin dashboard APIs (stats, users, management)"
        elif "accuracy" in file_lower:
            return "📊 System accuracy and analytics APIs"
        elif "search" in file_lower:
            return "🔍 Search functionality APIs"
    
    elif "models" in path_lower:
        if "user" in file_lower:
            return "👤 User database model"
        elif "student" in file_lower:
            return "👨‍🎓 Student database model"
        elif "class" in file_lower:
            return "📚 Class database model"
        elif "attendance" in file_lower:
            return "📅 Attendance database model"
    
    elif "utils" in path_lower:
        if "db" in file_lower:
            return "🗄️ Database connection and utilities"
        elif "auth" in file_lower:
            return "🔐 Authentication utilities (hash, JWT)"
        elif "cloudinary" in file_lower:
            return "☁️ Cloudinary integration for image storage"
        elif "email" in file_lower:
            return "📧 Email service (Brevo/Sendinblue)"
    
    elif "ai" in path_lower:
        if "face_recognition" in file_lower:
            return "🤖 Face recognition core engine"
        elif "face_detection" in file_lower:
            return "👁️ Face detection module"
        elif "train" in file_lower:
            return "🧠 Model training and incremental learning"
        elif "image_augmentation" in file_lower:
            return "🖼️ Image augmentation for better training"
    
    elif "realtime" in path_lower:
        if "camera" in file_lower:
            return "📷 Real-time camera feed processing"
    
    # Frontend descriptions
    elif "components" in path_lower:
        if "admin" in file_lower and "dashboard" in file_lower:
            return "🛡️ Admin dashboard main component"
        elif "teacher" in file_lower and "dashboard" in file_lower:
            return "👨‍🏫 Teacher dashboard main component"
        elif "student" in file_lower and "dashboard" in file_lower:
            return "👨‍🎓 Student dashboard main component"
        elif "searchbar" in file_lower:
            return "🔍 Search bar component"
        elif "accuracy" in file_lower:
            return "📊 Accuracy dashboard component"
        elif "auth" in file_lower:
            return "🔐 Authentication pages (login, signup)"
    
    elif "services" in path_lower:
        if "api" in file_lower:
            return "🌐 API service with axios interceptors"
        elif "auth" in file_lower:
            return "🔐 Authentication service (login, logout, token)"
    
    elif "types" in path_lower:
        return "📋 TypeScript type definitions"
    
    # Default
    return "📄 Utility/Configuration file"

def generate_project_map(root_dir, output_file="project_map.txt"):
    """Generate project map with file descriptions"""
    
    ignore_dirs = ["node_modules", "venv", "__pycache__", ".git", "dist", "build", ".vscode", ".next"]
    ignore_extensions = [".pyc", ".pyo", ".pyd", ".log", ".tmp"]
    
    result = []
    
    # Title
    result.append("="*80)
    result.append("📁 DIGITAL ATTENDANCE VIA FACE RECOGNITION - PROJECT MAP")
    result.append("="*80)
    result.append("")
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip ignored directories
        dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
        
        # Get relative path
        rel_path = os.path.relpath(dirpath, root_dir)
        if rel_path == ".":
            continue
        
        # Add directory heading
        indent = rel_path.count(os.sep) * 2
        result.append(" " * indent + f"📁 {os.path.basename(dirpath)}/")
        
        # Process files
        for filename in sorted(filenames):
            # Skip ignored extensions
            ext = os.path.splitext(filename)[1]
            if ext in ignore_extensions:
                continue
            
            filepath = os.path.join(dirpath, filename)
            description = get_file_description(filepath, filename)
            
            # File size
            try:
                size = os.path.getsize(filepath)
                if size < 1024:
                    size_str = f"{size} B"
                elif size < 1024*1024:
                    size_str = f"{size/1024:.1f} KB"
                else:
                    size_str = f"{size/(1024*1024):.1f} MB"
            except:
                size_str = "N/A"
            
            result.append(" " * (indent + 2) + f"📄 {filename}")
            result.append(" " * (indent + 4) + f"   → {description}")
            result.append(" " * (indent + 4) + f"   📏 {size_str}")
            result.append("")
    
    # Save to file
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(result))
    
    print(f"✅ Project map saved to: {output_file}")
    return result

if __name__ == "__main__":
    import sys
    
    # Get project root
    if len(sys.argv) > 1:
        root = sys.argv[1]
    else:
        root = "D:/Final Year Project"
    
    if not os.path.exists(root):
        print(f"❌ Path not found: {root}")
        sys.exit(1)
    
    print(f"🔍 Scanning project: {root}")
    generate_project_map(root, "project_map.txt")