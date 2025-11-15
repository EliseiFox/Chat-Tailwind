import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { initializeDb } from './database.js'; // <-- Импортируем нашу функцию

// --- Настройка путей ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Инициализация БД при старте сервера ---
let db;
try {
    db = await initializeDb();
} catch (err) {
    console.error('Ошибка инициализации базы данных:', err);
    process.exit(1); // Выходим, если не смогли подключиться к БД
}

// --- УДАЛЯЕМ СТАРЫЕ ХРАНИЛИЩА В ПАМЯТИ ---
// const users = new Set();
// const messages = [];

// --- Создание HTTP сервера ---
const server = http.createServer(async (req, res) => {
    // ... Логика раздачи статических файлов остается БЕЗ ИЗМЕНЕНИЙ ...
    // ... Но API регистрации меняется:
    if (req.url === '/api/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => { // <-- делаем обработчик асинхронным
            try {
                const { username } = JSON.parse(body);

                // 1. Проверяем, есть ли пользователь в БД
                const existingUser = await db.get('SELECT * FROM users WHERE username = ?', username);

                if (existingUser) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Такой никнейм уже занят' }));
                } else {
                    // 2. Если нет - добавляем пользователя в БД
                    await db.run('INSERT INTO users (username) VALUES (?)', username);
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Регистрация успешна' }));
                }
            } catch (err) {
                console.error('Ошибка регистрации:', err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Ошибка сервера или неверный формат запроса' }));
            }
        });
        return;
    }
    // ... (остальной код для раздачи файлов тот же) ...
});


// --- Создание и настройка WebSocket сервера ---
const wss = new WebSocketServer({ server });

wss.on('connection', async (ws) => { // <-- делаем обработчик асинхронным
    console.log('Клиент подключился по WebSocket');

    // 3. Отправляем новому клиенту историю сообщений из БД
    try {
        const lastMessages = await db.all('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50');
        // Отправляем в правильном порядке (старые -> новые)
        lastMessages.reverse().forEach(msg => ws.send(JSON.stringify(msg)));
    } catch (err) {
        console.error('Не удалось загрузить историю сообщений:', err);
    }

    ws.on('message', async (message) => { // <-- делаем обработчик асинхронным
        try {
            const parsedMessage = JSON.parse(message);
            console.log('Получено сообщение:', parsedMessage);

            // 4. Сохраняем сообщение в БД
            await db.run('INSERT INTO messages (username, text) VALUES (?, ?)', 
                parsedMessage.username, 
                parsedMessage.text
            );

            // Рассылаем сообщение всем подключенным клиентам (эта часть не меняется)
            wss.clients.forEach((client) => {
                if (client.readyState === client.OPEN) {
                    client.send(JSON.stringify(parsedMessage));
                }
            });
        } catch (err) {
            console.error('Ошибка обработки сообщения:', err);
        }
    });

    ws.on('close', () => {
        console.log('Клиент отключился');
    });
});

// --- Запуск сервера (без изменений) ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});