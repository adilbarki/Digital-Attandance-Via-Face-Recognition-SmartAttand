# Python 3.11 base image
FROM python:3.11-slim

# Working directory set karo
WORKDIR /app

# System dependencies install karo (for dlib/opencv)
RUN apt-get update && apt-get install -y \
    cmake \
    build-essential \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    && rm -rf /var/lib/apt/lists/*

# Requirements copy karo
COPY backend/requirements.txt .

# Python dependencies install karo
RUN pip install --no-cache-dir -r requirements.txt

# Poora backend copy karo
COPY backend/ .

# Port expose karo
EXPOSE 8000

# Server run karo
CMD ["uvicorn", "run:app", "--host", "0.0.0.0", "--port", "8000"]