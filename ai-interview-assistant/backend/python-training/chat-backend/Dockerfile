FROM python:3.12-slim as builder

WORKDIR /build

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    libffi-dev \
    libssl-dev \
    libpq-dev \
    python-dev-is-python3 \
    git \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# pyproject.toml of dentist_shared
COPY ./pyproject.toml .
# pyproject.toml of chat-backend
RUN mkdir chat-backend_dependency

COPY ./chat-backend/pyproject.toml ./chat-backend_dependency/

RUN pip install --upgrade pip build poetry poetry-plugin-export
# Build file whl for gc_dentist_share module
RUN python -m build
# Export requirements.txt
RUN poetry config virtualenvs.create false &&\
    poetry --directory ./chat-backend_dependency/ export -f requirements.txt --without-hashes --output /build/requirements.txt
# Install dependencies
RUN pip install --upgrade pip\
    &&pip install --no-cache -r requirements.txt\
    &&pip install /build/dist/*.whl && rm -rf ./dist
###############################
FROM python:3.12-slim as runner

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app
# Copy python lib from Builder
COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application files
COPY chat-backend/app .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
