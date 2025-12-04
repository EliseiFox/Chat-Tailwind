// server.js (Express версия)
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express'; // Импортируем express
import { WebSocketServer } from 'ws';
console.log("ееееееееееее");

// --- Настройка путей и Express приложения ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); // Создаем экземпляр Express-приложения

// --- Хранилище данных в памяти (остается без изменений) ---
const users = new Set();
const messages = [];

// --- Middleware (Промежуточное ПО) ---
// 1. Middleware для парсинга JSON-тела запросов
app.use(express.json());
// 2. Middleware для раздачи статических файлов из папки 'public'
app.use(express.static(path.join(__dirname, 'public')));


// --- Роутинг (Маршрутизация) ---
app.post('/api/register', (req, res) => {
    try {
        const { username } = req.body; // express.json() сделал это возможным!

        if (!username) {
            return res.status(400).json({ message: 'Имя пользователя не может быть пустым' });
        }

        if (users.has(username)) {
            // Отправляем ответ с кодом 409 Conflict
            return res.status(409).json({ message: 'Такой никнейм уже занят' });
        } else {
            users.add(username);
            // Отправляем ответ с кодом 201 Created
            return res.status(201).json({ message: 'Регистрация успешна' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});


// --- Создание HTTP и WebSocket серверов ---
// Нам все еще нужен 'http' сервер, чтобы "привязать" к нему WebSocket сервер
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Логика WebSocket (остается почти без изменений) ---
wss.on('connection', (ws) => {
    console.log('Клиент подключился по WebSocket');

    messages.forEach(msg => ws.send(JSON.stringify(msg)));

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        console.log('Получено сообщение:', parsedMessage);

        messages.push(parsedMessage);
        if (messages.length > 50) {
            messages.shift();
        }

        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(parsedMessage));
            }
        });
    });

    ws.on('close', () => {
        console.log('Клиент отключился');
    });
});


// --- Запуск сервера ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});