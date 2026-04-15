import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/neurotalk_ai")

# Create a MongoDB client
client = MongoClient(MONGO_URI)

# Extract database name from URI, defaulting to neurotalk_ai
db_name = MONGO_URI.split('/')[-1].split('?')[0]
if not db_name:
    db_name = "neurotalk_ai"

# Access the database
db = client[db_name]
