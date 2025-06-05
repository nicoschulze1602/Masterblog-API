from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

POSTS = [
    {"id": 1, "title": "First post", "content": "This is the first post."},
    {"id": 2, "title": "Second post", "content": "This is the second post."},
]


@app.route('/api/posts', methods=['GET'])
def get_posts():
    return jsonify(POSTS)



@app.route('/api/posts', methods=['POST'])
def add_post():
    new_post = request.get_json()
    if not new_post or 'title' not in new_post or 'content' not in new_post:
        return jsonify({"error": "Invalid data"}), 400

    new_id = max(post['id'] for post in POSTS) + 1 if POSTS else 1
    post = {
        "id": new_id,
        "title": new_post['title'],
        "content": new_post['content']
    }
    POSTS.append(post)
    return jsonify(post), 201


@app.route('/api/posts/<int:id>', methods=['DELETE'])
def delete_post(id):
    global POSTS

    post_to_delete = next((post for post in POSTS if post['id'] == id), None)
    if post_to_delete is None:
        return jsonify({"error": f"Post with id {id} not found."}), 404

    POSTS = [post for post in POSTS if post['id'] != id]
    return jsonify({"message": f"Post with id {id} has been deleted successfully."}), 200


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5002, debug=True)
