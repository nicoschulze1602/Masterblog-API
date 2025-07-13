# backend_app.py
from flask import Flask
from flask_cors import CORS

from config import Config
from routes import api_bp, swagger_ui_blueprint, welcome_text

# =============================================================================
# App Configuration
# =============================================================================
app = Flask(__name__, static_folder='static') # Ensure static folder is recognized

app.config.update(
    SESSION_COOKIE_SAMESITE=Config.SESSION_COOKIE_SAMESITE,
    SESSION_COOKIE_SECURE=Config.SESSION_COOKIE_SECURE
)

app.secret_key = Config.SECRET_KEY
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})

# Register Blueprints
app.register_blueprint(api_bp)
app.register_blueprint(swagger_ui_blueprint, url_prefix=Config.SWAGGER_URL)

# Register the welcome route
app.add_url_rule('/', 'welcome', welcome_text)

# =============================================================================
# Run Application
# =============================================================================
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5002, debug=True)