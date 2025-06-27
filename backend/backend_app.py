# -*- coding: utf-8 -*-
"""A simple Flask API for managing users and posts in JSON files."""

import json
import os
from datetime import datetime
from uuid import uuid4

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

# =============================================================================
# App Configuration
# =============================================================================
app = Flask(__name__)

app.config.update(
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=False
)

# 💡 For production, the secret key should be loaded from an environment variable!
#    e.g., app.secret_key = os.environ.get('SECRET_KEY')
app.secret_key = 'supersecretkey'
# FIX: Corrected CORS origin to allow requests from the frontend's port (5001)
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "http://localhost:5001"}})

# Define paths to JSON data files
BASE_DIR = os.path.dirname(__file__)
USER_FILE = os.path.join(BASE_DIR, 'users.json')
POST_FILE = os.path.join(BASE_DIR, 'blogposts.json')


# =============================================================================
# JSON Helper Functions
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
    return load_data(USER_FILE, {})


def save_users(users):
    """Save user data to the user file."""
    save_data(USER_FILE, users)


def load_posts():
    """Load post data from the post file."""
    return load_data(POST_FILE, [])


def save_posts(posts):
    """Save post data to the post file."""
    save_data(POST_FILE, posts)


# =============================================================================
# Authentication Routes
# =============================================================================

@app.route('/api/register', methods=['POST'])
def register():
    """
    Register a new user.

    Expects a JSON body with 'username' and 'password'.
    Returns:
        - 201 Created: If registration is successful.
        - 400 Bad Request: If username/password are missing or user exists.
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    users = load_users()
    if username in users:
        return jsonify({"error": "Username already exists"}), 400

    users[username] = {
        "id": str(uuid4()),
        "password_hash": generate_password_hash(password)
    }
    save_users(users)
    return jsonify({"message": f"User {username} registered successfully."}), 201


@app.route('/api/login', methods=['POST'])
def login():
    """
    Log a user in by creating a session.

    Expects a JSON body with 'username' and 'password'.
    Returns:
        - 200 OK: If login is successful.
        - 401 Unauthorized: If credentials are invalid.
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    users = load_users()
    user = users.get(username)

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({"error": "Invalid credentials"}), 401

    session['user'] = username
    return jsonify({"message": f"Logged in as {username}"}), 200


@app.route('/api/logout', methods=['POST'])
def logout():
    """Log the current user out by clearing the session."""
    session.pop('user', None)
    return jsonify({"message": "Logged out successfully"}), 200


@app.route('/api/session', methods=['GET'])
def session_info():
    """Get information about the current session."""
    if 'user' in session:
        return jsonify({"user": session['user']})
    return jsonify({"user": None}), 200


# =============================================================================
# Post Routes
# =============================================================================

@app.route('/api/posts', methods=['GET'])
def get_posts():
    """
    Retrieve a list of all posts.

    Query Params:
        - sort (str, optional): Field to sort by ('title', 'content').
        - direction (str, optional): 'asc' or 'desc'. Default is 'asc'.
    """
    posts = load_posts()

    # Ensure backward compatibility: all posts have a likes and comments list
    for post in posts:
        post.setdefault("likes", [])
        post.setdefault("comments", [])

    sort_field = request.args.get('sort')
    sort_direction = request.args.get('direction', 'asc')

    if sort_field in ['title', 'content']:
        reverse = sort_direction == 'desc'
        posts.sort(key=lambda post: post[sort_field].lower(), reverse=reverse)

    return jsonify(posts)


@app.route('/api/posts/search', methods=['GET'])
def search_for_post():
    """
    Search for posts based on title and/or content.

    Query Params:
        - title (str, optional): A substring to search for in post titles.
        - content (str, optional): A substring to search for in post content.
    """
    posts = load_posts()
    title_query = request.args.get('title')
    content_query = request.args.get('content')

    if title_query:
        posts = [p for p in posts if title_query.lower() in p['title'].lower()]
    if content_query:
        posts = [p for p in posts if content_query.lower() in p['content'].lower()]

    return jsonify(posts)


@app.route('/api/posts', methods=['POST'])
def add_post():
    """
    Add a new post. Requires user to be logged in.

    Expects a JSON body with 'title' and 'content'.
    Returns:
        - 201 Created: If the post is created successfully.
        - 400 Bad Request: If title or content are missing.
        - 401 Unauthorized: If the user is not logged in.
    """
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401

    new_post_data = request.get_json()
    # Ensure new_post_data is not None and has required fields
    if not new_post_data or 'title' not in new_post_data or 'content' not in new_post_data:
        return jsonify({"error": "Invalid data, 'title' and 'content' are required."}), 400

    posts = load_posts()
    post = {
        "id": str(uuid4()),
        "title": new_post_data['title'],
        "content": new_post_data['content'],
        "author": session['user'],
        "timestamp": datetime.now().isoformat(),
        "likes": [],
        "comments": []
    }
    posts.append(post)
    save_posts(posts)
    return jsonify(post), 201


@app.route('/api/posts/<string:post_id>', methods=['PUT'])
def update_post(post_id):
    """
    Update an existing post.

    Requires user to be logged in and to be the author of the post.
    Expects a JSON body with optional 'title' and 'content'.
    Returns:
        - 200 OK: If update is successful.
        - 400 Bad Request: If no data is provided.
        - 401 Unauthorized: If user is not logged in.
        - 403 Forbidden: If user is not the author.
        - 404 Not Found: If the post does not exist.
    """
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401

    updated_data = request.get_json()
    if not updated_data:
        return jsonify({"error": "No input data provided."}), 400

    posts = load_posts()
    post_to_update = next((p for p in posts if p['id'] == post_id), None)

    if not post_to_update:
        return jsonify({"error": f"Post with id {post_id} not found."}), 404
    if post_to_update.get('author') != session['user']:
        return jsonify({"error": "Not authorized to edit this post."}), 403

    post_to_update['title'] = updated_data.get('title', post_to_update['title'])
    post_to_update['content'] = updated_data.get('content', post_to_update['content'])
    save_posts(posts)

    return jsonify(post_to_update), 200


@app.route('/api/posts/<string:post_id>/comments', methods=['POST'])
def add_comment(post_id):
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json()
    comment_text = data.get("text", "").strip()
    if not comment_text:
        return jsonify({"error": "Comment text is required."}), 400

    posts = load_posts()
    for post in posts:
        if post["id"] == post_id:
            post.setdefault("comments", []).append({
                "author": session['user'],
                "timestamp": datetime.now().isoformat(),
                "text": comment_text
            })
            save_posts(posts)
            return jsonify({"message": "Comment added."}), 201

    return jsonify({"error": "Post not found."}), 404


@app.route('/api/posts/<string:post_id>/like-toggle', methods=['PUT'])
def toggle_like(post_id):
    if 'user' not in session:
        return jsonify({"error": "Login required"}), 401

    current_user = session['user']
    posts = load_posts()

    for post in posts:
        if post["id"] == post_id:
            post.setdefault("likes", [])

            if current_user in post["likes"]:
                post["likes"].remove(current_user)
            else:
                post["likes"].append(current_user)

            save_posts(posts)
            return jsonify({
                "likes": len(post["likes"]),
                "liked_by_user": current_user in post["likes"]
            })

    return jsonify({"error": "Post not found"}), 404


@app.route('/api/posts/<string:post_id>', methods=['DELETE'])
def delete_post(post_id):
    """
    Delete a post by its ID.

    Requires user to be logged in and to be the author of the post.
    Returns:
        - 200 OK: If deletion is successful.
        - 401 Unauthorized: If user is not logged in.
        - 403 Forbidden: If user is not the author.
        - 404 Not Found: If the post does not exist.
    """
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401

    posts = load_posts()
    post_to_delete = next((p for p in posts if p['id'] == post_id), None)

    if not post_to_delete:
        return jsonify({"error": f"Post with id {post_id} not found."}), 404
    if post_to_delete.get('author') != session['user']:
        return jsonify({"error": "Not authorized to delete this post."}), 403

    posts = [p for p in posts if p['id'] != post_id]
    save_posts(posts)
    return jsonify({"message": f"Post with id {post_id} has been deleted successfully."}), 200


# =============================================================================
# Run Application
# =============================================================================
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5002, debug=True)
