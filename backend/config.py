import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration."""
    # Load SECRET_KEY from environment variable, provide a fallback for local dev if .env is missing (though it shouldn't be for production)
    SECRET_KEY = os.environ.get('SECRET_KEY', 'a_fallback_secret_for_dev_if_env_is_not_set')
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False
    SWAGGER_URL = "/api/docs"
    API_URL = "/static/masterblog.json"
    CORS_ORIGINS = ["http://localhost:5001", "http://127.0.0.1:5001"]

    # Define paths to JSON data files
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    USER_FILE = os.path.join(BASE_DIR, 'users.json')
    POST_FILE = os.path.join(BASE_DIR, 'blogposts.json')