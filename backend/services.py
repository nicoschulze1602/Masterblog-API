# services.py (updated)
import json
import os
from datetime import datetime
from uuid import uuid4

# Import configuration
from config import Config

# =============================================================================
# JSON Helper Functions (Post-specific, or general if not moved to utils)
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


def load_posts():
    """Load post data from the post file."""
    return load_data(Config.POST_FILE, [])


def save_posts(posts):
    """Save post data to the post file."""
    save_data(Config.POST_FILE, posts)

# =============================================================================
# Post Services
# =============================================================================

def get_all_posts(sort_field=None, sort_direction='asc', offset=0, limit=None, search_query='', search_scope='all'):
    """
    Retrieves and filters posts.
    """
    posts = load_posts()
    posts.sort(key=lambda p: p['timestamp'], reverse=True) # Default sort by timestamp

    # Ensure backward compatibility: all posts have a likes and comments list
    for post in posts:
        post.setdefault("likes", [])
        post.setdefault("comments", [])

    if search_query:
        filtered_posts = []
        lower_search_query = search_query.lower()
        for post in posts:
            match = False
            if search_scope == 'all':
                if lower_search_query in post['title'].lower() or \
                   lower_search_query in post['content'].lower():
                    match = True
            elif search_scope == 'title':
                if lower_search_query in post['title'].lower():
                    match = True
            elif search_scope == 'content':
                if lower_search_query in post['content'].lower():
                    match = True
            if match:
                filtered_posts.append(post)
        posts = filtered_posts

    if sort_field in ['title', 'content']:
        reverse = sort_direction == 'desc'
        posts.sort(key=lambda blogpost: post[sort_field].lower(), reverse=reverse)

    total_posts = len(posts)
    paginated_posts = posts[offset:]

    if limit is not None:
        paginated_posts = paginated_posts[:limit]

    has_more = (offset + len(paginated_posts)) < total_posts
    return {
        "posts": paginated_posts,
        "total_posts": total_posts,
        "has_more": has_more
    }

def create_new_post(title, content, author):
    """Creates a new blog post."""
    posts = load_posts()
    post = {
        "id": str(uuid4()),
        "title": title,
        "content": content,
        "author": author,
        "timestamp": datetime.now().strftime('%Y-%m-%d, %H:%M:%S'),
        "likes": [],
        "comments": []
    }
    posts.append(post)
    save_posts(posts)
    return post

def update_existing_post(post_id, updated_data, current_user):
    """Updates an existing post."""
    posts = load_posts()
    post_to_update = next((p for p in posts if p['id'] == post_id), None)

    if not post_to_update:
        return None, 404 # Not found
    if post_to_update.get('author') != current_user:
        return None, 403 # Forbidden

    post_to_update['title'] = updated_data.get('title', post_to_update['title'])
    post_to_update['content'] = updated_data.get('content', post_to_update['content'])
    save_posts(posts)
    return post_to_update, 200

def delete_single_post(post_id, current_user):
    """Deletes a post."""
    posts = load_posts()
    post_to_delete = next((p for p in posts if p['id'] == post_id), None)

    if not post_to_delete:
        return False, 404 # Not found
    if post_to_delete.get('author') != current_user:
        return False, 403 # Forbidden

    updated_posts = [p for p in posts if p['id'] != post_id]
    save_posts(updated_posts)
    return True, 200

def add_comment_to_post(post_id, comment_text, author):
    """Adds a comment to a specific post."""
    posts = load_posts()
    for post in posts:
        if post["id"] == post_id:
            post.setdefault("comments", []).append({
                "author": author,
                "timestamp": datetime.now().isoformat(),
                "text": comment_text
            })
            save_posts(posts)
            return True, 201
    return False, 404

def toggle_post_like(post_id, current_user):
    """Toggles a like on a post."""
    posts = load_posts()
    for post in posts:
        if post["id"] == post_id:
            post.setdefault("likes", [])
            if current_user in post["likes"]:
                post["likes"].remove(current_user)
            else:
                post["likes"].append(current_user)
            save_posts(posts)
            return {
                "likes": len(post["likes"]),
                "liked_by_user": current_user in post["likes"]
            }, 200
    return {"error": "Post not found"}, 404