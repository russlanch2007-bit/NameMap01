// ===== КЛИЕНТСКИЙ КОД (работает в браузере) =====

// 1. Находим элементы
const canvas = document.getElementById('canvas');
const container = document.getElementById('canvasContainer');
const donutButton = document.getElementById('donutButton');

// 2. Перетаскивание холста
let isDragging = false;
let startX, startY;
let canvasLeft = 0, canvasTop = 0;

container.addEventListener('mousedown', function(e) {
    if (e.target === donutButton) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    canvasLeft = parseInt(canvas.style.left) || 0;
    canvasTop = parseInt(canvas.style.top) || 0;
    container.style.cursor = 'grabbing';
});

document.addEventListener('mouseup', function() {
    isDragging = false;
    container.style.cursor = 'grab';
});

document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    canvas.style.left = (canvasLeft + deltaX) + 'px';
    canvas.style.top = (canvasTop + deltaY) + 'px';
});

// 3. Генератор ID
function generateID() {
    return 'NICK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

// 4. Загрузка никнеймов с сервера при старте
async function loadNicksFromServer() {
    console.log('Загружаю ники с сервера...');
    
    try {
        const response = await fetch('http://localhost:3000/api/get-all-nicks');
        const nicks = await response.json();
        
        console.log('Загружено ников:', nicks.length);
        
        nicks.forEach(nick => {
            const nickElement = document.createElement('div');
            nickElement.className = 'nickname';
            nickElement.textContent = nick.text;
            nickElement.style.left = nick.x + 'px';
            nickElement.style.top = nick.y + 'px';
            nickElement.dataset.id = nick.id;
            canvas.appendChild(nickElement);
        });
        
    } catch (error) {
        console.log('Не удалось загрузить ники:', error.message);
    }
}

// 5. Добавление нового ника
donutButton.addEventListener('click', async function() {
    const nickname = prompt('Введите ваш ник (до 100 символов):');
    
    if (!nickname || nickname.trim() === '') return;
    
    if (nickname.length > 100) {
        alert('Максимум 100 символов!');
        return;
    }
    
    // Скрываем кнопку
    this.style.display = 'none';
    
    // Генерируем ID
    const nickId = generateID();
    
    // Координаты (центр экрана)
    const x = window.innerWidth / 2 - 50;
    const y = window.innerHeight / 2 - 20;
    
    // Создаём элемент на странице
    const nickElement = document.createElement('div');
    nickElement.className = 'nickname';
    nickElement.textContent = nickname;
    nickElement.style.left = x + 'px';
    nickElement.style.top = y + 'px';
    nickElement.dataset.id = nickId;
    canvas.appendChild(nickElement);
    
    // Анимация
    nickElement.style.opacity = '0';
    setTimeout(() => {
        nickElement.style.transition = 'opacity 0.3s';
        nickElement.style.opacity = '1';
    }, 10);
    
    // Сохраняем на сервер
    try {
        const response = await fetch('http://localhost:3000/api/save-nick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: nickId,
                text: nickname,
                x: x,
                y: y
            })
        });
        
        const result = await response.json();
        console.log('Сервер сохранил:', result);
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
    
    console.log('Ник добавлен:', nickname);
});

// 6. Загрузка при старте страницы
window.addEventListener('load', function() {
    console.log('Страница загружена!');
    
    // Загружаем сохранённые ники
    loadNicksFromServer();
    
    // Если нет ников, добавляем тестовый
    setTimeout(() => {
        if (document.querySelectorAll('.nickname').length === 0) {
            const testNick = document.createElement('div');
            testNick.className = 'nickname';
            testNick.textContent = 'Кликай на кнопку ↓';
            testNick.style.left = '500px';
            testNick.style.top = '500px';
            canvas.appendChild(testNick);
        }
    }, 500);
});