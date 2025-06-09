from flask import Flask, jsonify, request, make_response, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from uuid import uuid4

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes
app.secret_key = 'supersecretkey'  # Für Sessions (in echten Projekten env nutzen!)

POSTS = [
    {"id": 1, "title": "Getting started with Flask", "content": "Flask is a lightweight WSGI web application framework."},
    {"id": 2, "title": "Advanced Django Tips", "content": "Learn how to optimize your Django application for performance."},
    {"id": 3, "title": "Python List Comprehensions", "content": "A concise way to create lists in Python."},
    {"id": 4, "title": "REST API Design", "content": "Best practices for designing a RESTful API."},
    {"id": 5, "title": "Introduction to Machine Learning", "content": "Explore the basics of machine learning with Python."},
    {"id": 6, "title": "Deploying Flask Apps", "content": "Guide to deploying your Flask application on Heroku."},
    {"id": 7, "title": "Handling Forms in Flask", "content": "Use WTForms to manage user input easily."},
    {"id": 8, "title": "Flask vs Django", "content": "Comparison between two popular Python web frameworks."},
    {"id": 9, "title": "Writing Tests in Python", "content": "How to use unittest and pytest for effective testing."},
    {"id": 10, "title": "Building a Blog with Flask", "content": "Step-by-step tutorial to create a blog using Flask."},
    {"id": 11, "title": "Understanding Python Decorators", "content": "Decorators allow you to modify the behavior of functions."},
    {"id": 12, "title": "Async Programming in Python", "content": "Use asyncio to write non-blocking code in Python."},
    {"id": 13, "title": "Flask Extensions You Should Know", "content": "Flask-Login, Flask-Migrate, and more useful tools."},
    {"id": 14, "title": "Simple CRUD with Flask and SQLite", "content": "Create, read, update, and delete entries with ease."},
    {"id": 15, "title": "Tips for Debugging Flask Apps", "content": "Use Flask's debugger and logging for error tracking."}
]

USERS = {}  # username -> {password_hash, id}


@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    if username in USERS:
        return jsonify({"error": "Username already exists"}), 400
    USERS[username] = {
        "id": str(uuid4()),
        "password_hash": generate_password_hash(password)
    }
    return jsonify({"message": f"User {username} registered successfully."}), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user = USERS.get(username)
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({"error": "Invalid credentials"}), 401
    session['user'] = username
    return jsonify({"message": f"Logged in as {username}"}), 200


@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({"message": "Logged out successfully"}), 200


@app.route('/api/posts/search', methods=['GET'])
def search_for_post():
    title_query = request.args.get('title')
    content_query = request.args.get('content')

    matching_posts = POSTS

    if title_query:
        matching_posts = [post for post in matching_posts if title_query.lower() in post['title'].lower()]
    if content_query:
        matching_posts = [post for post in matching_posts if content_query.lower() in post['content'].lower()]

    return jsonify(matching_posts)


@app.route('/api/posts', methods=['GET'])
def get_posts():
    sort_field = request.args.get('sort')
    sort_direction = request.args.get('direction', 'asc')  # default: ascending

    if sort_field in ['title', 'content']:
        reverse = sort_direction == 'desc'
        sorted_posts = sorted(POSTS, key=lambda post: post[sort_field].lower(), reverse=reverse)
        return jsonify(sorted_posts)

    return jsonify(POSTS)


@app.route('/api/posts', methods=['POST'])
def add_post():
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401
    new_post = request.get_json()
    if not new_post or 'title' not in new_post or 'content' not in new_post:
        return jsonify({"error": "Invalid data"}), 400

    new_id = max(post['id'] for post in POSTS) + 1 if POSTS else 1
    post = {
        "id": new_id,
        "title": new_post['title'],
        "content": new_post['content'],
        "author": session['user']
    }
    POSTS.append(post)
    return jsonify(post), 201


@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401
    global POSTS

    post_to_delete = next((post for post in POSTS if post['id'] == post_id), None)
    if post_to_delete is None:
        return jsonify({"error": f"Post with id {post_id} not found."}), 404
    if post_to_delete.get('author') != session['user']:
        return jsonify({"error": "Not authorized to delete this post."}), 403

    POSTS = [post for post in POSTS if post['id'] != post_id]
    return jsonify({"message": f"Post with id {post_id} has been deleted successfully."}), 200


@app.route('/api/posts/<int:post_id>', methods=['PUT'])
def update_post(post_id):
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401
    updated_data = request.get_json()
    if updated_data is None:
        return jsonify({"error": "No input provided."}), 400

    post = next((post for post in POSTS if post['id'] == post_id), None)
    if post is None:
        return jsonify({"error": f"Post with id {post_id} not found."}), 404
    if post.get('author') != session['user']:
        return jsonify({"error": "Not authorized to edit this post."}), 403

    # Nur aktualisieren, wenn neue Werte übergeben wurden
    post['title'] = updated_data.get('title', post['title'])
    post['content'] = updated_data.get('content', post['content'])

    return jsonify(post), 200


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5002, debug=True)
