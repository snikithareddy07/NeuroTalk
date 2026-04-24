FROM python:3.11

WORKDIR /app

COPY backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend
COPY ml/ ./ml

EXPOSE 5001

WORKDIR /app/backend

CMD ["python", "app.py"]