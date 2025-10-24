FROM python:3.12-slim

# Prevent Python from writing .pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# ---- System dependencies (adjust if you need GDAL, Pillow, etc.) ----
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# ---- Install Python dependencies ----
COPY requirements.txt /app/
RUN python -m pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ---- Copy application code ----
COPY . /app/

# ---- Expose Django port ----
EXPOSE 8080

# ---- Default command (dev server) ----
# For production you'll switch this to gunicorn in another Dockerfile
CMD ["python", "manage.py", "runserver", "0.0.0.0:8080"]