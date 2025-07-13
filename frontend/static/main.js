// Global variable for message area timeout
let messageTimeout;
// Global offset for post pagination
let currentPostOffset = 0;
const POSTS_PER_PAGE = 5; // Number of posts per load

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
    // Fetch and insert welcome message
    fetch(savedBaseUrl.replace(/\/api$/, '') + '/api/welcome')
      .then(response => response.text())
      .then(html => {
        const container = document.getElementById('welcome-message');
        if (container) container.innerHTML = html;
      })
      .catch(error => {
        console.error('Failed to load welcome message:', error);
      });
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
// `append` parameter indicates whether to add new posts or replace existing ones
async function loadPosts(append = false) {
    const baseUrl = document.getElementById('api-base-url').value;
    localStorage.setItem('apiBaseUrl', baseUrl);

    // References for the new Search UI
    const searchInput = document.getElementById('search-query');
    const searchScope = document.getElementById('search-scope');

    const sortField = document.getElementById('sort-field').value;
    const sortDirection = document.getElementById('sort-direction').value;

    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-posts-indicator');
    loadingIndicator.style.display = 'block';

    // Get values from search fields
    const searchQuery = searchInput ? searchInput.value.trim() : '';
    const searchScopeValue = searchScope ? searchScope.value : 'all';

    let url = baseUrl + '/posts';
    const loadMoreBtn = document.getElementById('load-more-btn'); // Button reference

    // Logic for search adaptation
    if (searchQuery) { // If a search term has been entered
        url = baseUrl + '/posts/search?';
        url += `query=${encodeURIComponent(searchQuery)}&`;
        url += `scope=${encodeURIComponent(searchScopeValue)}&`;
        currentPostOffset = 0; // Reset offset for new search to ensure fresh results
        loadMoreBtn.style.display = 'none'; // Search results are currently not paginated
    } else {
        url += '?';
        // Add pagination parameters only if no search is active
        url += `offset=${currentPostOffset}&limit=${POSTS_PER_PAGE}&`;
        // The Load More button will be displayed later based on data.has_more
    }

    if (sortField) url += `sort=${sortField}&`;
    if (sortDirection) url += `direction=${sortDirection}&`;

    url = url.replace(/[&?]$/, '');

    try {
        const sessionRes = await fetch(baseUrl + '/session', { credentials: 'include' });
        const session = await sessionRes.json();
        console.log("Session:", session);
        const currentUser = session.user || null;

        const statusDiv = document.getElementById('session-status');
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        // Update UI based on login status
        if (currentUser) {
            statusDiv.textContent = `✅ Logged in as ${currentUser}`;
            statusDiv.style.color = 'green';
            loginBtn.style.display = 'none';
            registerBtn.style.display = 'none';
            usernameInput.style.display = 'none';
            passwordInput.style.display = 'none';
            logoutBtn.style.display = 'inline-block'; // Show logout button
        } else {
            statusDiv.textContent = '❌ Not logged in';
            statusDiv.style.color = 'red';
            loginBtn.style.display = 'inline-block';
            registerBtn.style.display = 'inline-block';
            usernameInput.style.display = 'inline-block';
            passwordInput.style.display = 'inline-block';
            logoutBtn.style.display = 'none'; // Hide logout button
        }

        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json(); // expect object with 'posts', 'total_posts', 'has_more'

        console.log("Posts from server:", data);
        const postContainer = document.getElementById('post-container');

        if (!append) { // if not - clear container
            postContainer.innerHTML = '';
        }

        const postsToRender = data.posts; // Backend now delivers in correct order (newest first)
                                           // .reverse() was removed in the backend step

        postsToRender.forEach(post => { // loop through the posts
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
            // initial shows only the last comment
            let commentsHtml = '';
            if (post.comments && post.comments.length > 0) {
                const lastComment = post.comments[post.comments.length - 1];
                commentsHtml = `
                    <div class="comment-summary">
                        <span class="comment-author">${lastComment.author}</span>:
                        <span class="comment-text">${lastComment.text}</span>
                        <span class="comment-time">(${new Date(lastComment.timestamp).toLocaleString()})</span>
                    </div>
                    ${post.comments.length > 1 ? `<button class="show-all-comments-btn" data-post-id="${post.id}">Show all comments (${post.comments.length})</button>` : ''}
                    <div class="full-comment-list" style="display:none;">
                        ${post.comments.map(c => `
                            <div class="comment">
                                <span class="comment-author">${c.author}</span>:
                                <span class="comment-text">${c.text}</span>
                                <span class="comment-time">(${new Date(c.timestamp).toLocaleString()})</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            let html = `
                <div class="post-content">
                    <div class="post-header">
                        <h2>${post.title}</h2>
                        <div class="post-meta">by <strong style="color: #007BFF; font-weight: bold;">${post.author}</strong> at ${new Date(post.timestamp).toLocaleDateString()}</div>
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
                        <input class="comment-input" placeholder="Write a comment..." />
                        <button class="comment-submit">Submit</button>
                        <div class="comment-feedback" style="display:none; color: green; font-size: 0.9em;">Sent ✅</div>
                        <div class="comment-warning">Comment cannot be empty.</div>
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

            // Event Listener for "Show all comments"
            const showAllCommentsBtn = postDiv.querySelector('.show-all-comments-btn');
            if (showAllCommentsBtn) {
                showAllCommentsBtn.addEventListener('click', () => {
                    const fullCommentList = postDiv.querySelector('.full-comment-list');
                    if (fullCommentList.style.display === 'none') {
                        fullCommentList.style.display = 'block';
                        showAllCommentsBtn.textContent = 'Hide comments';
                    } else {
                        fullCommentList.style.display = 'none';
                        showAllCommentsBtn.textContent = `Show all comments (${post.comments.length})`;
                    }
                });
            }

            const likeBtn = postDiv.querySelector('.like-btn');
            const likeCountSpan = postDiv.querySelector('.like-count');
            const isLiked = post.likes?.includes(currentUser);
            // Opacity logic reversed: 1 for liked, 0.5 for not liked
            likeBtn.style.opacity = isLiked ? 1 : 0.5;

            likeBtn?.addEventListener('click', () => {
                fetch(`${baseUrl}/posts/${post.id}/like-toggle`, {
                    method: 'PUT',
                    credentials: 'include'
                })
                .then(res => res.json())
                .then(data => {
                    likeCountSpan.textContent = data.likes;
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
                        displayMessage('Comment text cannot be empty.', 'warning');
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
                                currentPostOffset = 0; // Reset offset to reload the entire list
                                loadPosts();  // Reload posts
                            }, 1000);
                        }
                        displayMessage('Comment added successfully!', 'success');
                    })
                    .catch(err => {
                        console.error('Comment submission failed:', err);
                        displayMessage(`Comment could not be added: ${err.message || 'Unknown error'}`, 'error');
                    });
                });
            }
            postContainer.appendChild(postDiv);
        });

        // Offset update and show/hide "Load More"-Button (only if not searching)
        if (!searchQuery) { // Only update offset and show button if not currently searching
            currentPostOffset += postsToRender.length; // raises offset by the number of loaded posts
            if (data.has_more) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }

    } catch (error) { // catch for the entire fetch-process
        console.error('Error loading posts or session:', error);
        displayMessage(`Error loading posts or session: ${error.message || 'Unknown error'}`, 'error');
    } finally {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
    }
}

// Function to load more posts
function loadMorePosts() {
    loadPosts(true); // Call loadPosts and tell it to append posts
}

// Function to toggle the visibility of the search and sort section
function toggleSearchSection() {
    const searchContainer = document.getElementById('search-container');
    if (searchContainer.style.display === 'none' || searchContainer.style.display === '') {
        searchContainer.style.display = 'flex'; // Use flex to match its flex-direction: column style
    } else {
        searchContainer.style.display = 'none';
    }
    currentPostOffset = 0; // Reset offset when toggling search to ensure fresh results
    loadPosts(); // Reload posts based on potential new search/sort criteria
}

// Function to toggle the visibility of the add post section
function toggleAddPostSection() {
    const addPostContainer = document.getElementById('add-post-container');
    if (addPostContainer) { // Check if the element exists
        if (addPostContainer.style.display === 'none' || addPostContainer.style.display === '') {
            addPostContainer.style.display = 'flex'; // Use flex to match its flex-direction: column style
        } else {
            addPostContainer.style.display = 'none';
        }
        // Optional: Clear fields when expanding the Add Post section
        document.getElementById('post-title').value = '';
        document.getElementById('post-content').value = '';
        // Hide warnings
        document.getElementById('title-warning').style.display = 'none';
        document.getElementById('content-warning').style.display = 'none';
    }
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
        displayMessage('Title cannot be empty.', 'warning');
        return;
    }

    if (!postContent.trim()) {
        contentWarning.style.display = 'block';
        displayMessage('Content cannot be empty.', 'warning');
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
        // Check if the response was successful (status 2xx)
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

        // Hide warnings if they were visible
        document.getElementById('title-warning').style.display = 'none';
        document.getElementById('content-warning').style.display = 'none';

        // Collapse the Add Post section
        const addPostContainer = document.getElementById('add-post-container');
        if (addPostContainer) {
            addPostContainer.style.display = 'none';
        }

        currentPostOffset = 0; // IMPORTANT: Reset offset so latest posts are loaded
        loadPosts(); // Reload the posts after adding a new one
    })
    .catch(error => {
        // Improved error logging to show the actual error and display to user
        console.error('Error adding post:', error.message || error);
        displayMessage(`Error adding post: ${error.message || 'Unknown error'}`, 'error');
    });
}

// Function to send a DELETE request to the API to delete a post
function deletePost(postId) {
    console.log("Attempting to delete post:", postId);
    displayMessage('Attempting to delete post...', 'info'); // Info message

    var baseUrl = document.getElementById('api-base-url').value;

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
        currentPostOffset = 0; // Reset offset so latest posts are loaded
        loadPosts(); // Reload the posts after deleting one
    })
    .catch(error => {
        console.error('Error deleting post:', error.message || error);
        displayMessage(`Error deleting post: ${error.message || 'Unknown error'}`, 'error');
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
        displayMessage('Post updated successfully!', 'success');
        currentPostOffset = 0; // Reset offset to reload the entire list
        loadPosts();
    })
    .catch(err => {
        console.error('Post update failed:', err.message || err);
        displayMessage(`Error updating post: ${err.message || 'Unknown error'}`, 'error');
    });
}

// --- Authentication functions ---
function register() {
    const baseUrl = document.getElementById('api-base-url').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username.trim() || !password.trim()) {
        displayMessage('Username and password are required.', 'warning');
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
        displayMessage(data.message || data.error, data.message && data.message.includes('successfully') ? 'success' : 'error'); // Check message content for success
    })
    .catch(err => {
        console.error('Registration failed:', err.message || err);
        displayMessage(`Registration failed: ${err.message || 'Unknown error'}`, 'error');
    });
}

function login() {
    const baseUrl = document.getElementById('api-base-url').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username.trim() || !password.trim()) {
        displayMessage('Please enter username and password.', 'warning');
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
        const msg = data.message || 'Logged in successfully!';
        console.log(msg);
        displayMessage(msg, 'success');
        // Update UI immediately after successful login
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('register-btn').style.display = 'none';
        document.getElementById('username').style.display = 'none';
        document.getElementById('password').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('session-status').textContent = `Logged in as ${username}`;
        currentPostOffset = 0; // Reset offset so latest posts are loaded
        loadPosts(); // Reload posts to update UI for current user's posts (edit/delete buttons)
    })
    .catch(error => {
        console.error('Login error:', error.message || error);
        displayMessage(`Login failed: ${error.message || 'Invalid credentials'}`, 'error');
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
        const msg = data.message || 'Logged out successfully!';
        console.log(msg);
        displayMessage(msg, 'success');
        // Update UI immediately after successful logout
        document.getElementById('login-btn').style.display = 'inline-block';
        document.getElementById('register-btn').style.display = 'inline-block';
        document.getElementById('username').style.display = 'inline-block';
        document.getElementById('password').style.display = 'inline-block';
        document.getElementById('logout-btn').style.display = 'none';
        const userInfo = document.getElementById('session-status');
        if (userInfo) userInfo.textContent = '';
        currentPostOffset = 0; // Reset offset so latest posts are loaded
        loadPosts(); // Reload posts after logout to hide edit/delete buttons
    })
    .catch(err => {
        console.error('Logout failed:', err.message || err);
        displayMessage(`Logout failed: ${err.message || 'Unknown error'}`, 'error');
    });
}
