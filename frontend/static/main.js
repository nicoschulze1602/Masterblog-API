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
    // Retrieve the base URL from the input field and save it to local storage
    var baseUrl = document.getElementById('api-base-url').value;
    localStorage.setItem('apiBaseUrl', baseUrl);

    // Use the Fetch API to send a GET request to the /posts endpoint
    fetch(baseUrl + '/posts')
        .then(response => response.json())  // Parse the JSON data from the response
        .then(data => {  // Once the data is ready, we can use it
            // Clear out the post container first
            const postContainer = document.getElementById('post-container');
            postContainer.innerHTML = '';

            // For each post in the response, create a new post element and add it to the page
            data.forEach(post => {
                const postDiv = document.createElement('div');
                postDiv.className = 'post';
                const baseUrl = document.getElementById('api-base-url').value;
                fetch(baseUrl + '/session', { credentials: 'include' })
                    .then(res => res.json())
                    .then(session => {
                        let html = `<h2>${post.title}</h2><p>${post.content}</p>`;
                        if (post.author === session.user) {
                            html += `<button onclick="deletePost(${post.id})">Delete</button>`;
                        }
                        postDiv.innerHTML = html;
                    });
                postContainer.appendChild(postDiv);
            });
        })
        .catch(error => console.error('Error:', error));  // If an error occurs, log it to the console
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
        document.getElementById('logout-btn').style.display = 'inline-block';
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
        document.getElementById('logout-btn').style.display = 'none';
    });
}
