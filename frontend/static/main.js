// Function that runs once the window is fully loaded
window.onload = function() {
    // Attempt to retrieve the API base URL from the local storage
    var savedBaseUrl = localStorage.getItem('apiBaseUrl');
    // If a base URL is found in local storage, load the posts
    if (savedBaseUrl) {
        document.getElementById('api-base-url').value = savedBaseUrl;
        loadPosts();
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

    let url = baseUrl;
    let isSearch = searchTitle || searchContent;
    if (isSearch) {
        url += '/search?';
        if (searchTitle) url += `title=${encodeURIComponent(searchTitle)}&`;
        if (searchContent) url += `content=${encodeURIComponent(searchContent)}&`;
    } else {
        url += '/posts?';
    }

    if (sortField) url += `sort=${sortField}&`;
    if (sortDirection) url += `direction=${sortDirection}&`;

    url = url.replace(/[&?]$/, '');

    fetch(baseUrl + '/session', { credentials: 'include' })
        .then(res => res.json())
        .then(session => {
            fetch(url, { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    const postContainer = document.getElementById('post-container');
                    postContainer.innerHTML = '';
                    data.reverse(); // recent first
                    data.forEach(post => {
                        const postDiv = document.createElement('div');
                        postDiv.className = 'post';
                        // Add class for my-post or other-post
                        if (post.author === session.user) {
                            postDiv.classList.add('my-post');
                        } else {
                            postDiv.classList.add('other-post');
                        }
                        let html = `<h2>${post.title}</h2><p>${post.content}</p>`;
                        if (post.author === session.user) {
                            html += `<button onclick="deletePost(${post.id})">Delete</button>`;
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
        alert('Fehler beim Login. Bitte API prüfen.');
    });  // <- Diese schließende Klammer war fehlend
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