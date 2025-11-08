// API базовый URL - автоматически определяется в зависимости от окружения
const API_URL = (() => {
    // Если на production домене (sizizxc.me), используем относительный путь
    if (window.location.hostname === 'sizizxc.me' || window.location.hostname === 'www.sizizxc.me') {
        return '/api';
    }
    // Для локальной разработки
    return 'http://localhost:3000/api';
})();

// Утилиты для работы с токеном
const TokenManager = {
    getToken() {
        return localStorage.getItem('token');
    },
    
    setToken(token) {
        localStorage.setItem('token', token);
    },
    
    removeToken() {
        localStorage.removeItem('token');
    },
    
    getUser() {
        const token = this.getToken();
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload;
        } catch (e) {
            return null;
        }
    }
};

// Проверка авторизации при загрузке страницы
function checkAuth() {
    const user = TokenManager.getUser();
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userName = document.getElementById('userName');
    
    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userName) {
            userName.textContent = user.username;
            userName.style.display = 'inline-block';
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (registerBtn) registerBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userName) userName.style.display = 'none';
    }
}

// Инициализация модальных окон
function initModals() {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const promptLoginBtn = document.getElementById('promptLoginBtn');
    const promptRegisterBtn = document.getElementById('promptRegisterBtn');
    
    // Открытие модальных окон
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (loginModal) loginModal.style.display = 'block';
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            if (registerModal) registerModal.style.display = 'block';
        });
    }
    
    if (promptLoginBtn) {
        promptLoginBtn.addEventListener('click', () => {
            if (loginModal) loginModal.style.display = 'block';
        });
    }
    
    if (promptRegisterBtn) {
        promptRegisterBtn.addEventListener('click', () => {
            if (registerModal) registerModal.style.display = 'block';
        });
    }
    
    // Закрытие модальных окон
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    // Закрытие при клике вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Выход
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            TokenManager.removeToken();
            checkAuth();
            if (window.location.pathname.includes('reviews.html')) {
                window.location.reload();
            }
        });
    }
}

// Регистрация
function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const errorElement = document.getElementById('registerError');
        
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                TokenManager.setToken(data.token);
                checkAuth();
                document.getElementById('registerModal').style.display = 'none';
                registerForm.reset();
                if (errorElement) errorElement.textContent = '';
                alert('Регистрация успешна!');
                if (window.location.pathname.includes('reviews.html')) {
                    window.location.reload();
                }
            } else {
                if (errorElement) {
                    errorElement.textContent = data.error || data.errors?.[0]?.msg || 'Ошибка при регистрации';
                }
            }
        } catch (error) {
            if (errorElement) {
                errorElement.textContent = 'Ошибка соединения с сервером';
            }
            console.error('Ошибка:', error);
        }
    });
}

// Вход
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorElement = document.getElementById('loginError');
        
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                TokenManager.setToken(data.token);
                checkAuth();
                document.getElementById('loginModal').style.display = 'none';
                loginForm.reset();
                if (errorElement) errorElement.textContent = '';
                alert('Вход выполнен успешно!');
                if (window.location.pathname.includes('reviews.html')) {
                    window.location.reload();
                }
            } else {
                if (errorElement) {
                    errorElement.textContent = data.error || data.errors?.[0]?.msg || 'Ошибка при входе';
                }
            }
        } catch (error) {
            if (errorElement) {
                errorElement.textContent = 'Ошибка соединения с сервером';
            }
            console.error('Ошибка:', error);
        }
    });
}

// Мобильное меню
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
        
        // Закрытие меню при клике на ссылку
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            });
        });
        
        // Закрытие меню при клике вне его
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            }
        });
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initModals();
    initRegisterForm();
    initLoginForm();
    initMobileMenu();
});

// Экспорт для использования в других файлах
window.TokenManager = TokenManager;
window.checkAuth = checkAuth;

