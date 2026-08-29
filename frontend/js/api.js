const API_BASE = 'http://localhost:3000/api';

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function logout() {
    localStorage.removeItem('token');
    const isPagesDir = window.location.pathname.includes('/pages/');
    window.location.href = isPagesDir ? '../index.html' : 'index.html';
}

function showToast(message, type = 'error') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px;';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    const bgColor = type === 'error' ? '#ef4444' : '#10b981';
    toast.style.cssText = `background:${bgColor}; color:white; padding:10px 20px; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1); font-size:0.9rem; font-family:Inter,sans-serif; opacity:0; transform:translateY(10px); transition:all 0.3s ease;`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Aplica transição de entrada.
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Aplica transição de saída e remove o elemento.
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro inesperado na requisição');
        }
        
        return data;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}
