import os
import sys
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

# Ensure we can import db
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

load_dotenv()

from db import db

def seed_admin():
    admin_email = "admin@neurotalk.ai"
    admin_username = "admin"
    admin_password = "adminpassword" # Hardcoded password per instructions

    # Check if admin already exists
    if db.users.find_one({"email": admin_email}):
        print("Admin user already exists.")
        return

    # Optionally clean up existing username 'admin' to avoid collisions
    db.users.delete_one({"username": admin_username})

    hashed_password = generate_password_hash(admin_password)

    admin_user = {
        "username": admin_username,
        "email": admin_email,
        "password": hashed_password,
        "role": "admin",
        "created_at": datetime.now(timezone.utc)
    }

    db.users.insert_one(admin_user)
    print("Admin created successfully")

if __name__ == "__main__":
    seed_admin()
