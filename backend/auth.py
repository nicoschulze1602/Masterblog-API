# auth.py
import json
import os
from uuid import uuid4
from werkzeug.security import check_password_hash, generate_password_hash
from config import Config

# =============================================================================
# User Data Helper Functions (Moved from services.py - specific to user data)
# =============================================================================

def load_data(file_path, default_value):
    """
    Load JSON data from a file.

    Args:
        file_path (str): The path to the JSON file.
        default_value: The value to return if the file does not exist
                       or an error occurs.

    Returns:
        The loaded JSON data or the default value.
    """
    if not os.path.exists(file_path):
        return default_value
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return default_value


def save_data(file_path, data):
    """
    Save data to a JSON file with pretty printing.

    Args:
        file_path (str): The path to the JSON file.
        data: The Python object (dict, list) to save.
    """
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)


def load_users():
    """Load user data from the user file."""
    return load_data(Config.USER_FILE, {})


def save_users(users):
    """Save user data to the user file."""
    save_data(Config.USER_FILE, users)

# =============================================================================
# Authentication Services
# =============================================================================

def register_user(username, password):
    """Registers a new user."""
    users = load_users()
    if username in users:
        return {"error": "Username already exists"}, 400

    users[username] = {
        "id": str(uuid4()),
        "password_hash": generate_password_hash(password)
    }
    save_users(users)
    return {"message": f"User {username} registered successfully."}, 201

def verify_user_login(username, password):
    """Verifies user credentials for login."""
    users = load_users()
    user = users.get(username)
    if not user or not check_password_hash(user['password_hash'], password):
        return False
    return True