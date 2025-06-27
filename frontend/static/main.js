// Global variable for message area timeout
let messageTimeout;

// Function that runs once the window is fully loaded
window.onload = function () {
    var savedBaseUrl = localStorage.getItem('apiBaseUrl');
    // Ensure the base URL is correctly set to 5002 for the Flask app
    if (!savedBaseUrl || !savedBaseUrl.includes('localhost:5002')) {
        savedBaseUrl = 'http://localhost:5002/api';
        localStorage.setItem('apiBaseUrl', savedBaseUrl);
    }
    document.getElementById('api-base-url').value = savedBaseUrl;
    loadPosts();
}

/**
 * Displays a temporary message to the user.
 * @param {string} message The message text.
 * @param {'success'|'error'|'info'|'warning'} type The type of message (for styling).
 */
function displayMessage(message, type) {
    const messageArea = document.getElementById('message-area');
    if (messageArea) {
        // Clear any existing timeout to prevent messages from disappearing too soon
        clearTimeout(messageTimeout);

        messageArea.textContent = message;
        messageArea.className = `message-area show ${type}`; // Add type class for styling
        messageArea.style.display = 'block'; // Make sure it's visible

        // Hide the message after 5 seconds
        messageTimeout = setTimeout(() => {
            messageArea.classList.remove('show'); // Start fade-out
            // After fade-out, hide completely
            setTimeout(() => {
                messageArea.style.display = 'none';
                messageArea.className = 'message-area'; // Reset classes
            }, 500); // Should match CSS transition duration
        }, 5000); // Message visible for 5 seconds
    }
}


// Function to fetch all the posts from the API and display them on the page
function loadPosts() {
    const baseUrl = document.getElementById('api-base-url').value;
    localStorage.setItem('apiBaseUrl', baseUrl);

    const searchTitle = document.getElementById('search-title').value;
    const searchContent = document.getElementById('search-content').value;
    const sortField = document.getElementById('sort-field').value;
    const sortDirection = document.getElementById('sort-direction').value;

    let url = baseUrl + '/posts';
    let isSearch = searchTitle || searchContent;
    if (isSearch) {
        url = baseUrl + '/posts/search?';
        if (searchTitle) url += `title=${encodeURIComponent(searchTitle)}&`;
        if (searchContent) url += `content=${encodeURIComponent(searchContent)}&`;
    } else {
        url += '?';
    }

    if (sortField) url += `sort=${sortField}&`;
    if (sortDirection) url += `direction=${sortDirection}&`;

    url = url.replace(/[&?]$/, '');

    fetch(baseUrl + '/session', { credentials: 'include' })
        .then(res => res.json())
        .catch(() => ({ user: null }))
        .then(session => {
            console.log("Session:", session);
            const currentUser = session.user || null;

            const statusDiv = document.getElementById('session-status');
            const loginBtn = document.getElementById('login-btn');
            const registerBtn = document.getElementById('register-btn');
            const logoutBtn = document.getElementById('logout-btn');
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const userInfoDiv = document.getElementById('user-info');

            // Update UI based on login status
            if (currentUser) {
                statusDiv.textContent = `✅ Logged in as ${currentUser}`;
                statusDiv.style.color = 'green';
                loginBtn.style.display = 'none';
                registerBtn.style.display = 'none';
                usernameInput.style.display = 'none';
                passwordInput.style.display = 'none';
                logoutBtn.style.display = 'inline-block'; // Show logout button
                userInfoDiv.textContent = `Logged in as ${currentUser}`; // Update user info
            } else {
                statusDiv.textContent = '❌ Not logged in';
                statusDiv.style.color = 'red';
                loginBtn.style.display = 'inline-block';
                registerBtn.style.display = 'inline-block';
                usernameInput.style.display = 'inline-block';
                passwordInput.style.display = 'inline-block';
                logoutBtn.style.display = 'none'; // Hide logout button
                userInfoDiv.textContent = ''; // Clear user info
            }

            fetch(url, { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    console.log("Posts from server:", data);
                    const postContainer = document.getElementById('post-container');
                    postContainer.innerHTML = '';
                    data.reverse(); // recent first

                    data.forEach(post => {
                        const postDiv = document.createElement('div');
                        postDiv.className = 'post';
                        postDiv.setAttribute('data-id', post.id);

                        if (post.author === currentUser) {
                            postDiv.classList.add('my-post');
                        } else {
                            postDiv.classList.add('other-post');
                        }

                        // Ensure post.likes and post.comments are always arrays for display
                        const likesCount = post.likes ? post.likes.length : 0;
                        const commentsHtml = post.comments ? post.comments.map(c => `
                            <div class="comment">
                                <span class="comment-author">${c.author}</span>:
                                <span class="comment-text">${c.text}</span>
                                <span class="comment-time">(${new Date(c.timestamp).toLocaleString()})</span>
                            </div>
                        `).join('') : '';


                        let html = `
                            <div class="post-content">
                                <div class="post-header">
                                    <h2>${post.title}</h2>
                                    <div class="post-meta">by ${post.author} at ${new Date(post.timestamp).toLocaleString()}</div>
                                </div>
                                <p>${post.content}</p>
                                <div class="like-section">
                                    <button class="like-btn" data-post-id="${post.id}">❤️</button>
                                    <span class="like-count">${likesCount}</span>
                                </div>

                                <div class="comment-list">
                                    ${commentsHtml}
                                </div>
                        `;

                        if (currentUser) {
                            html += `
                                <div class="comment-form">
                                    <input class="comment-input" placeholder="write a comment..." />
                                    <button class="comment-submit">submit</button>
                                    <div class="comment-feedback" style="display:none; color: green; font-size: 0.9em;">submitted ✅</div>
                                    <div class="comment-warning">comment can not be empty.</div>
                                </div>
                            `;
                        }

                        html += `</div>`;

                        if (post.author === currentUser) {
                            html += `
                                <div class="button-group">
                                    <button class="delete-btn" onclick="deletePost('${post.id}')">Delete</button>
                                    <button class="edit-btn" onclick='renderEditForm(${JSON.stringify(post)})'>Edit</button>
                                </div>
                            `;
                        }

                        postDiv.innerHTML = html;

                        const likeBtn = postDiv.querySelector('.like-btn');
                        const likeCountSpan = postDiv.querySelector('.like-count');
                        const isLiked = post.likes?.includes(currentUser);
                        // FIX: Opacity logic reversed: 1 for liked, 0.5 for not liked
                        likeBtn.style.opacity = isLiked ? 1 : 0.5;

                        likeBtn?.addEventListener('click', () => {
                            fetch(`${baseUrl}/posts/${post.id}/like-toggle`, {
                                method: 'PUT',
                                credentials: 'include'
                            })
                            .then(res => res.json())
                            .then(data => {
                                likeCountSpan.textContent = data.likes;
                                // FIX: Opacity logic reversed: 1 for liked, 0.5 for not liked
                                likeBtn.style.opacity = data.liked_by_user ? 1 : 0.5;
                            })
                            .catch(err => console.error('Like toggle failed:', err));
                        });

                        if (currentUser) {
                            const input = postDiv.querySelector('.comment-input');
                            const btn = postDiv.querySelector('.comment-submit');
                            btn.addEventListener('click', () => {
                                const warning = postDiv.querySelector('.comment-warning');
                                const text = input.value.trim();
                                if (!text) {
                                    if (warning) warning.style.display = 'block';
                                    displayMessage('Kommentartext kann nicht leer sein.', 'warning');
                                    return;
                                }
                                if (warning) warning.style.display = 'none'; // Hide if valid text

                                fetch(`${baseUrl}/posts/${post.id}/comments`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({ text })
                                })
                                .then(res => {
                                    if (!res.ok) { // Check if response was successful
                                        return res.json().then(errData => { throw new Error(errData.error || `HTTP error! status: ${res.status}`); });
                                    }
                                    return res.json();
                                })
                                .then(() => {
                                    input.value = '';
                                    const feedback = postDiv.querySelector('.comment-feedback');
                                    if (feedback) {
                                        feedback.style.display = 'block';
                                        setTimeout(() => {
                                            feedback.style.display = 'none';
                                            loadPosts();  // reload after brief feedback
                                        }, 1000);
                                    }
                                    displayMessage('Kommentar erfolgreich hinzugefügt!', 'success');
                                })
                                .catch(err => {
                                    console.error('Comment submission failed:', err);
                                    displayMessage(`Fehler beim Hinzufügen des Kommentars: ${err.message || 'Unbekannter Fehler'}`, 'error');
                                });
                            });
                        }
                        postContainer.appendChild(postDiv);
                    });
                })
                .catch(error => {
                    console.error('Error loading posts:', error);
                    displayMessage(`Fehler beim Laden der Posts: ${error.message || 'Unbekannter Fehler'}`, 'error');
                });
        });
}

// Function to send a POST request to the API to add a new post
function addPost() {
    const titleWarning = document.getElementById('title-warning');
    const contentWarning = document.getElementById('content-warning');
    if (titleWarning) titleWarning.style.display = 'none';
    if (contentWarning) contentWarning.style.display = 'none';

    // Retrieve the values from the input fields
    var baseUrl = document.getElementById('api-base-url').value;
    var postTitle = document.getElementById('post-title').value;
    var postContent = document.getElementById('post-content').value;

    if (!postTitle.trim()) {
        titleWarning.style.display = 'block';
        displayMessage('Title can not be empty.', 'warning');
        return;
    }

    if (!postContent.trim()) {
        contentWarning.style.display = 'block';
        displayMessage('Content can not be empty.', 'warning');
        return;
    }

    // Use the Fetch API to send a POST request to the /posts endpoint with credentials
    fetch(baseUrl + '/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: postTitle, content: postContent }),
        credentials: 'include'
    })
    .then(response => {
        // FIX: Check if the response was successful (status 2xx)
        if (!response.ok) {
            // If not successful, parse the error message from the backend
            return response.json().then(errData => {
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();  // Parse the JSON data from the response
    })
    .then(post => {
        console.log('Post added:', post);
        displayMessage('Post added successfully!', 'success');
        document.getElementById('post-title').value = '';
        document.getElementById('post-content').value = '';
        loadPosts(); // Reload the posts after adding a new one
    })
    .catch(error => {
        // FIX: Improved error logging to show the actual error and display to user
        console.error('Error adding post:', error.message || error);
        displayMessage(`Error adding post: ${error.message || 'Unknown Error'}`, 'error');
    });
}

// Function to send a DELETE request to the API to delete a post
function deletePost(postId) {
    // FIX: Replaced confirm() with a console log and direct action.
    // In a real app, you'd use a custom modal for confirmation.
    console.log("Attempting to delete post:", postId);
    // if (!confirm("Do you really want to delete this post?")) {
    //     return;
    // }
    displayMessage('Try to delete this post...', 'info'); // Info message

    var baseUrl = document.getElementById('api-base-url').value;

    // Use the Fetch API to send a DELETE request to the specific post's endpoint with credentials
    fetch(baseUrl + '/posts/' + postId, {
        method: 'DELETE',
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => { throw new Error(errData.error || `HTTP error! status: ${response.status}`); });
        }
        console.log('Post deleted:', postId);
        displayMessage('Post deleted successfully!', 'success');
        loadPosts(); // Reload the posts after deleting one
    })
    .catch(error => {
        console.error('Error deleting post:', error.message || error);
        displayMessage(`Error deleting post: ${error.message || 'Unknown Error'}`, 'error');
    });
}

function editPost(postId, currentTitle, currentContent) {
    renderEditForm({id: postId, title: currentTitle, content: currentContent, author: ''});
}

function renderEditForm(post) {
    const postDiv = document.querySelector(`[data-id="${post.id}"]`);
    if (!postDiv) return;

    postDiv.innerHTML = `
        <div class="post-content">
            <div class="post-header">
                <input class="edit-title" value="${post.title}" />
                <div class="post-meta">edited by ${post.author}</div>
            </div>
            <textarea class="edit-content">${post.content}</textarea>
            <div class="edit-actions">
                <button class="save-edit-btn">Save</button>
                <button class="cancel-edit-btn">Cancel</button>
            </div>
        </div>
    `;

    postDiv.querySelector('.save-edit-btn').addEventListener('click', () => {
        const newTitle = postDiv.querySelector('.edit-title').value;
        const newContent = postDiv.querySelector('.edit-content').value;
        submitEdit(post.id, newTitle, newContent);
    });

    postDiv.querySelector('.cancel-edit-btn').addEventListener('click', () => {
        loadPosts();
    });
}

function submitEdit(postId, newTitle, newContent) {
    const baseUrl = document.getElementById('api-base-url').value;
    fetch(`${baseUrl}/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: newTitle, content: newContent })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(errData => { throw new Error(errData.error || `HTTP error! status: ${res.status}`); });
        }
        return res.json();
    })
    .then(() => {
        displayMessage('Post updated!', 'success');
        loadPosts();
    })
    .catch(err => {
        console.error('Post update failed:', err.message || err);
        displayMessage(`Error by updating post: ${err.message || 'Unknown Error'}`, 'error');
    });
}

// --- Authentication functions ---
function register() {
    const baseUrl = document.getElementById('api-base-url').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username.trim() || !password.trim()) {
        displayMessage('Username and password are required', 'warning');
        return;
    }

    fetch(baseUrl + '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(errData => { throw new Error(errData.error || `HTTP error! status: ${res.status}`); });
        }
        return res.json();
    })
    .then(data => {
        console.log(data.message || data.error);
        displayMessage(data.message || data.error, data.message && data.message.includes('erfolgreich') ? 'success' : 'error'); // Check message content for success
    })
    .catch(err => {
        console.error('Registration failed:', err.message || err);
        displayMessage(`Registrierung failed: ${err.message || 'Unknown Error'}`, 'error');
    });
}

function login() {
    const baseUrl = document.getElementById('api-base-url').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username.trim() || !password.trim()) {
        displayMessage('Please enter Username.', 'warning');
        return;
    }

    fetch(baseUrl + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(errData => { throw new Error(errData.error || `HTTP error! status: ${res.status}`); });
        }
        return res.json();
    })
    .then(data => {
        console.log(data.message || data.error);
        displayMessage(data.message || 'You logged in successfully!', 'success'); // Always show success message on OK response
        // Update UI immediately after successful login
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('register-btn').style.display = 'none';
        document.getElementById('username').style.display = 'none';
        document.getElementById('password').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('user-info').textContent = `Logged in as ${username}`;
        loadPosts(); // Reload posts to update UI for current user's posts (edit/delete buttons)
    })
    .catch(error => {
        console.error('Login error:', error.message || error);
        displayMessage(`Login failed: ${error.message || 'invalid input'}`, 'error');
    });
}

function logout() {
    const baseUrl = document.getElementById('api-base-url').value;
    fetch(baseUrl + '/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(errData => { throw new Error(errData.error || `HTTP error! status: ${res.status}`); });
        }
        return res.json();
    })
    .then(data => {
        console.log(data.message || data.error);
        displayMessage(data.message || 'logged in!', 'success');
        // Update UI immediately after successful logout
        document.getElementById('login-btn').style.display = 'inline-block';
        document.getElementById('register-btn').style.display = 'inline-block';
        document.getElementById('username').style.display = 'inline-block';
        document.getElementById('password').style.display = 'inline-block';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('user-info').textContent = '';
        loadPosts(); // Reload posts after logout to hide edit/delete buttons
    })
    .catch(err => {
        console.error('Logout failed:', err.message || err);
        displayMessage(`Logout failed: ${err.message || 'Unknown Error'}`, 'error');
    });
}
