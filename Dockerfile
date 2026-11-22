# syntax=docker/dockerfile:1
FROM python:3.13-slim AS base

# Prevent Python from writing .pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install minimal OS runtime dependencies & ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Python package dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create non-root application user for production security hardening
RUN groupadd -g 1001 synora && \
    useradd -u 1001 -g synora -s /bin/bash -m synora

# Copy backend source code and benchmark tools
COPY src /app/src
COPY pytest.ini /app/
COPY .env.example /app/.env.example

# Set correct ownership for non-root execution
RUN chown -R synora:synora /app

USER synora

EXPOSE 8000

# Default command starts the FastAPI Web Service.
# For Render Background Worker, override the command in render.yaml:
# "python -m src.queue.worker"
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
