// Function that runs once the window is fully loaded
window.onload = function () {
    var savedBaseUrl = localStorage.getItem('apiBaseUrl');
    if (!savedBaseUrl || !savedBaseUrl.includes('localhost')) {
        savedBaseUrl = 'http://localhost:5002/api';
        localStorage.setItem('apiBaseUrl', savedBaseUrl);
    }
    document.getElementById('api-base-url').value = savedBaseUrl;
    loadPosts();
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

                        let html = `
                            <div class="post-content">
                                <div class="post-header">
                                    <h2>${post.title}</h2>
                                    <div class="post-meta">by ${post.author} at ${new Date(post.timestamp).toLocaleString()}</div>
                                </div>
                                <p>${post.content}</p>
                            </div>
                        `;

                        if (post.author === currentUser) {
                            html += `
                                <div class="button-group">
                                    <button class="delete-btn" onclick="deletePost('${post.id}')">Delete</button>
                                    <button class="edit-btn" onclick='renderEditForm(${JSON.stringify(post)})'>Edit</button>
                                </div>
                            `;
                        }

                        postDiv.innerHTML = html;
                        postContainer.appendChild(postDiv);
                    });
                });
        });
}

// Function to send a POST request to the API to add a new post
function addPost() {
    // Retrieve the values from the input fields
    var baseUrl = document.getElementById('api-base-url').value;
    var postTitle = document.getElementById('post-title').value;
    var postContent = document.getElementById('post-content').value;

    // Use the Fetch API to send a POST request to the /posts endpoint with credentials
    fetch(baseUrl + '/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: postTitle, content: postContent }),
        credentials: 'include'
    })
    .then(response => response.json())  // Parse the JSON data from the response
    .then(post => {
        console.log('Post added:', post);
        document.getElementById('post-title').value = '';
        document.getElementById('post-content').value = '';
        loadPosts(); // Reload the posts after adding a new one
    })
    .catch(error => console.error('Error:', error));  // If an error occurs, log it to the console
}

// Function to send a DELETE request to the API to delete a post
function deletePost(postId) {
    var baseUrl = document.getElementById('api-base-url').value;

    // Use the Fetch API to send a DELETE request to the specific post's endpoint with credentials
    fetch(baseUrl + '/posts/' + postId, {
        method: 'DELETE',
        credentials: 'include'
    })
    .then(response => {
        console.log('Post deleted:', postId);
        loadPosts(); // Reload the posts after deleting one
    })
    .catch(error => console.error('Error:', error));  // If an error occurs, log it to the console
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
    .then(res => res.json())
    .then(() => loadPosts())
    .catch(err => alert('Fehler beim Aktualisieren des Posts'));
}

// --- Authentication functions ---
function register() {
    const baseUrl = document.getElementById('api-base-url').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch(baseUrl + '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => alert(data.message || data.error));
}

function login() {
    const baseUrl = document.getElementById('api-base-url').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch(baseUrl + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message || data.error);
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('register-btn').style.display = 'none';
        document.getElementById('user-info').textContent = `Logged in as ${username}`;
    })
    .catch(error => {
        console.error('Login error:', error);
        alert('Login Error. Please check the API.');
    });
}

function logout() {
    const baseUrl = document.getElementById('api-base-url').value;
    fetch(baseUrl + '/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message || data.error);
        document.getElementById('login-btn').style.display = 'inline-block';
        document.getElementById('register-btn').style.display = 'inline-block';
        document.getElementById('user-info').textContent = '';
    });
}