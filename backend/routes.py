from flask import Blueprint, jsonify, request, session
from flask_swagger_ui import get_swaggerui_blueprint

from auth import register_user, verify_user_login # Import from auth.py
from services import ( # Import from services.py
    get_all_posts, create_new_post, update_existing_post, delete_single_post,
    add_comment_to_post, toggle_post_like
)
from config import Config

# Create a Blueprint for API routes
api_bp = Blueprint('api', __name__, url_prefix='/api')

# =============================================================================
# Swagger UI Setup (consider moving this into backend_app.py or its own file if complex)
# =============================================================================
swagger_ui_blueprint = get_swaggerui_blueprint(
    Config.SWAGGER_URL,
    Config.API_URL,
    config={ 'app_name': 'Masterblog API' }
)

# =============================================================================
# Authentication Routes
# =============================================================================

@api_bp.route('/register', methods=['POST'])
def register_route():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    # Call function from auth.py
    message, status_code = register_user(username, password)
    return jsonify(message), status_code

@api_bp.route('/login', methods=['POST'])
def login_route():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # Call function from auth.py
    if verify_user_login(username, password):
        session['user'] = username
        return jsonify({"message": f"Logged in as {username}"}), 200
    return jsonify({"error": "Invalid credentials"}), 401

@api_bp.route('/logout', methods=['POST'])
def logout_route():
    session.pop('user', None)
    return jsonify({"message": "Logged out successfully"}), 200

@api_bp.route('/session', methods=['GET'])
def session_info_route():
    if 'user' in session:
        return jsonify({"user": session['user']})
    return jsonify({"user": None}), 200

# =============================================================================
# Post Routes
# =============================================================================

@api_bp.route('/posts', methods=['GET'])
def get_posts_route():
    sort_field = request.args.get('sort')
    sort_direction = request.args.get('direction', 'asc')
    try:
        offset = int(request.args.get('offset', 0))
    except (ValueError, TypeError):
        offset = 0

    try:
        limit = int(request.args.get('limit')) if request.args.get('limit') else None
    except (ValueError, TypeError):
        limit = None

    # If both search query and sort parameters are present, prioritize search.
    search_query = request.args.get('query', '')
    search_scope = request.args.get('scope', 'all')

    if search_query:
        # Call search function if query is present
        result = get_all_posts(search_query=search_query, search_scope=search_scope)
    else:
        # Otherwise, call for all posts with sorting/pagination
        result = get_all_posts(
            sort_field=sort_field,
            sort_direction=sort_direction,
            offset=offset,
            limit=limit
        )
    return jsonify(result)

@api_bp.route('/posts/search', methods=['GET'])
def search_posts_route():
    search_query = request.args.get('query', '')
    search_scope = request.args.get('scope', 'all')
    result = get_all_posts(search_query=search_query, search_scope=search_scope)
    return jsonify(result)

@api_bp.route('/posts', methods=['POST'])
def add_post_route():
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401

    new_post_data = request.get_json()
    if not new_post_data or 'title' not in new_post_data or 'content' not in new_post_data:
        return jsonify({"error": "Invalid data, 'title' and 'content' are required."}), 400

    post = create_new_post(new_post_data['title'], new_post_data['content'], session['user'])
    return jsonify(post), 201

@api_bp.route('/posts/<string:post_id>', methods=['PUT'])
def update_post_route(post_id):
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401

    updated_data = request.get_json()
    if not updated_data:
        return jsonify({"error": "No input data provided."}), 400

    post, status_code = update_existing_post(post_id, updated_data, session['user'])
    if post:
        return jsonify(post), status_code
    return jsonify({"error": "Post not found." if status_code == 404 else "Not authorized to edit this post."}), status_code

@api_bp.route('/posts/<string:post_id>/comments', methods=['POST'])
def add_comment_route(post_id):
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json()
    comment_text = data.get("text", "").strip()
    if not comment_text:
        return jsonify({"error": "Comment text is required."}), 400

    success, status_code = add_comment_to_post(post_id, comment_text, session['user'])
    if success:
        return jsonify({"message": "Comment added."}), status_code
    return jsonify({"error": "Post not found."}), status_code

@api_bp.route('/posts/<string:post_id>/like-toggle', methods=['PUT'])
def toggle_like_route(post_id):
    if 'user' not in session:
        return jsonify({"error": "Login required"}), 401

    result, status_code = toggle_post_like(post_id, session['user'])
    return jsonify(result), status_code


@api_bp.route('/posts/<string:post_id>', methods=['DELETE'])
def delete_post_route(post_id):
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401

    success, status_code = delete_single_post(post_id, session['user'])
    if success:
        return jsonify({"message": f"Post with id {post_id} has been deleted successfully."}), status_code
    return jsonify({"error": f"Post with id {post_id} not found." if status_code == 404 else "Not authorized to delete this post."}), status_code


@api_bp.route("/welcome")
def welcome_text():
    return '''
        <div class="welcome-box">
            <h2>👋 Welcome to the Masterblog API!</h2>
            <p>You've just connected to a blogging powerhouse — now with <strong>extra JSON crunch!</strong> 📝⚡️</p>
            <p>Wanna see what this API can do? <a href="/api/docs" target="_blank">Check out the docs here 🚀</a></p>
            <p>Have fun and don't forget to log out before you vanish! 😄</p>
        </div>
    '''