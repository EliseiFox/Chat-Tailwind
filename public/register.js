const form = document.getElementById('register-form');
const usernameInput = document.getElementById('username');
const errorMessage = document.getElementById('error-message');

form.addEventListener('submit', async (event) => {
    event.preventDefault(); // Предотвращаем перезагрузку страницы
    const username = usernameInput.value.trim();

    if (!username) return;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        if (response.ok) {
            // Сохраняем имя пользователя в браузере
            localStorage.setItem('chat_username', username);
            // Переходим на страницу чата
            window.location.href = '/';
        } else {
            const error = await response.json();
            errorMessage.textContent = error.message;
        }
    } catch (err) {
        errorMessage.textContent = 'Ошибка сети. Попробуйте снова.';
    }
});