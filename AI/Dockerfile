FROM python:3.10-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/home/app/.cache/huggingface

COPY requirements.docker.txt .
RUN pip install --prefer-binary -r requirements.docker.txt

RUN useradd --create-home --uid 10001 app \
    && mkdir -p /app/db /app/tts_cache /home/app/.cache \
    && chown -R app:app /app /home/app

COPY --chown=app:app app/ ./app/
COPY --chown=app:app main.py ./

EXPOSE 8001

USER app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
