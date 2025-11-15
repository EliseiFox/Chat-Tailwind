// Простая "аутентификация"
const username = localStorage.getItem('chat_username');
if (!username) {
    window.location.href = '/register.html';
}

document.getElementById('username-display').textContent = username;

const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

// Подключаемся к WebSocket серверу
// Используем 'ws://' или 'wss://' для защищенного соединения
const socket = new WebSocket(`ws://${window.location.host}`);

socket.onopen = () => {
    console.log('WebSocket соединение установлено.');
};

// Обработчик входящих сообщений
socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    addMessageToChat(message);
};

socket.onclose = () => {
    addMessageToChat({ system: true, text: 'Соединение потеряно. Попробуйте обновить страницу.' });
};

socket.onerror = (error) => {
    console.error('WebSocket ошибка:', error);
};

// Обработчик отправки формы
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text) {
        const message = { username, text };
        socket.send(JSON.stringify(message));
        messageInput.value = '';
    }
});

function addMessageToChat(message) {
    const item = document.createElement('div');
    item.className = 'mb-2';

    if (message.system) {
        item.innerHTML = `<p class="text-center text-gray-500 text-sm"><em>${message.text}</em></p>`;
    } else {
        const isMyMessage = message.username === username;
        item.className = `flex ${isMyMessage ? 'justify-end' : 'justify-start'}`;
        item.innerHTML = `
            <div class="${isMyMessage ? 'bg-blue-500 text-white' : 'bg-white'} rounded-lg p-3 max-w-xs`">
                ${!isMyMessage ? `<p class="text-xs font-bold text-gray-600">${message.username}</p>` : ''}
                <p>${message.text}</p>
            </div>
        `;
    }

    messagesContainer.appendChild(item);
    // Автоматическая прокрутка вниз
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}