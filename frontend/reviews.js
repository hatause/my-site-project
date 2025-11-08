// API базовый URL - автоматически определяется в зависимости от окружения
const API_URL = (() => {
    // Если на production домене (sizizxc.me), используем относительный путь
    if (window.location.hostname === 'sizizxc.me' || window.location.hostname === 'www.sizizxc.me') {
        return '/api';
    }
    // Для локальной разработки
    return 'http://localhost:3000/api';
})();

// Загрузка отзывов с таймаутом
async function loadReviews() {
    const reviewsContainer = document.getElementById('reviewsContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    if (!reviewsContainer) {
        console.error('❌ reviewsContainer не найден');
        return;
    }
    
    try {
        if (loadingSpinner) loadingSpinner.style.display = 'block';
        
        // Добавляем таймаут для запроса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд
        
        let response;
        try {
            response = await fetch(`${API_URL}/reviews`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Превышено время ожидания ответа от сервера');
            }
            throw fetchError;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText || `HTTP error! status: ${response.status}` };
            }
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const reviews = await response.json();
        
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        
        // Проверка на массив
        if (!Array.isArray(reviews)) {
            console.error('❌ Неверный формат ответа:', reviews);
            throw new Error('Неверный формат ответа от сервера');
        }
        
        if (reviews.length === 0) {
            reviewsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Пока нет отзывов. Будьте первым!</p>';
            return;
        }
        
        reviewsContainer.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <span class="review-author">${escapeHtml(review.username || 'Анонимный пользователь')}</span>
                    <span class="review-date">${formatDate(review.created_at)}</span>
                </div>
                <div class="review-rating">${'★'.repeat(review.rating || 0)}${'☆'.repeat(5 - (review.rating || 0))}</div>
                <div class="review-comment">${escapeHtml(review.comment || '')}</div>
            </div>
        `).join('');
    } catch (error) {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        const errorMessage = error.message || 'Неизвестная ошибка';
        console.error('❌ Ошибка загрузки отзывов:', error);
        reviewsContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">Ошибка при загрузке отзывов: ${escapeHtml(errorMessage)}</p>
                <button onclick="loadReviews()" class="btn btn-outline">Попробовать снова</button>
            </div>
        `;
    }
}

// Инициализация формы отзыва
function initReviewForm() {
    const reviewForm = document.getElementById('reviewForm');
    if (!reviewForm) return;
    
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = window.TokenManager?.getToken();
        if (!token) {
            alert('Пожалуйста, войдите в систему для оставления отзыва');
            return;
        }
        
        const rating = document.querySelector('input[name="rating"]:checked')?.value;
        const comment = document.getElementById('reviewComment').value;
        const errorElement = document.getElementById('reviewError');
        
        if (!rating) {
            if (errorElement) errorElement.textContent = 'Пожалуйста, выберите оценку';
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rating: parseInt(rating), comment })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                reviewForm.reset();
                if (errorElement) errorElement.textContent = '';
                loadReviews();
                alert('Отзыв успешно добавлен!');
            } else {
                if (errorElement) {
                    errorElement.textContent = data.error || data.errors?.[0]?.msg || 'Ошибка при добавлении отзыва';
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

// Показать/скрыть форму отзыва в зависимости от авторизации
function toggleReviewForm() {
    const user = window.TokenManager?.getUser();
    const addReviewSection = document.getElementById('addReviewSection');
    const loginPrompt = document.getElementById('loginPrompt');
    
    console.log('🔍 Проверка авторизации для формы отзывов:', user ? 'Пользователь авторизован' : 'Пользователь не авторизован');
    
    if (user) {
        if (addReviewSection) {
            addReviewSection.style.display = 'block';
            console.log('✅ Форма отзывов показана для авторизованного пользователя');
        }
        if (loginPrompt) loginPrompt.style.display = 'none';
    } else {
        if (addReviewSection) addReviewSection.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
    }
}

// Утилиты
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} ${getMinutesWord(minutes)} назад`;
    if (hours < 24) return `${hours} ${getHoursWord(hours)} назад`;
    if (days < 7) return `${days} ${getDaysWord(days)} назад`;
    
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getMinutesWord(minutes) {
    if (minutes % 10 === 1 && minutes % 100 !== 11) return 'минуту';
    if ([2, 3, 4].includes(minutes % 10) && ![12, 13, 14].includes(minutes % 100)) return 'минуты';
    return 'минут';
}

function getHoursWord(hours) {
    if (hours % 10 === 1 && hours % 100 !== 11) return 'час';
    if ([2, 3, 4].includes(hours % 10) && ![12, 13, 14].includes(hours % 100)) return 'часа';
    return 'часов';
}

function getDaysWord(days) {
    if (days % 10 === 1 && days % 100 !== 11) return 'день';
    if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) return 'дня';
    return 'дней';
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Страница отзывов загружена');
    
    // Загружаем отзывы
    loadReviews();
    
    // Инициализируем форму отзывов
    initReviewForm();
    
    // Показываем/скрываем форму в зависимости от авторизации
    toggleReviewForm();
    
    // Обновить форму при изменении авторизации
    const originalCheckAuth = window.checkAuth;
    if (originalCheckAuth) {
        window.checkAuth = function() {
            originalCheckAuth();
            toggleReviewForm();
        };
    }
    
    // Также обновляем форму после успешного входа/регистрации
    // Слушаем события изменения авторизации
    window.addEventListener('storage', (e) => {
        if (e.key === 'token') {
            toggleReviewForm();
        }
    });
    
    // Проверяем авторизацию при загрузке
    if (window.checkAuth) {
        window.checkAuth();
    }
});

// Экспорт функций для использования в других файлах
window.loadReviews = loadReviews;
window.toggleReviewForm = toggleReviewForm;

