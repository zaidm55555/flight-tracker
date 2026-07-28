FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir playwright && \
    playwright install chromium && \
    playwright install-deps chromium

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY flight_scraper.py .

CMD ["python", "flight_scraper.py", "--from", "AMD", "--to", "BLR", "--date", "2026-08-11", "--save-db"]
