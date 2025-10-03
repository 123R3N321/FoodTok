FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (uncomment libpq-dev if/when using Postgres)
# RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

# Default dev command (overridden by docker-compose if needed)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]