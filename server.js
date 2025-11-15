import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import sqlite3 from 'sqlite3'; // 1. Импортируем sqlite3

// --- Настройка путей ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Подключаемся к нашей базе данных
const db = new sqlite3.Database('./chat.db', (err) => {
    if (err) {
        console.error('Ошибка при подключении к БД:', err.message);
    } else {
        console.log('Подключено к базе данных chat.db');
    }
});

// 3. Удаляем старые переменные, они нам больше не нужны
// const users = new Set();
// const messages = [];

// --- Создание HTTP сервера ---
const server = http.createServer(async (req, res) => {
    // ... (код для раздачи статических файлов остается без изменений)

    // --- Обновленный роутинг для API регистрации ---
    if (req.url === '/api/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { username } = JSON.parse(body);

                // Ищем пользователя в БД
                db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ message: 'Ошибка сервера' }));
                    }
                    if (row) {
                        // Пользователь найден, имя занято
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Такой никнейм уже занят' }));
                    } else {
                        // Пользователь не найден, добавляем его в БД
                        db.run(`INSERT INTO users (username) VALUES (?)`, [username], function(err) {
                            if (err) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                return res.end(JSON.stringify({ message: 'Ошибка при регистрации' }));
                            }
                            res.writeHead(201, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: 'Регистрация успешна' }));
                        });
                    }
                });
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Неверный формат запроса' }));
            }
        });
        return;
    }
    
    // ... (код для раздачи статических файлов)
});

// --- Создание и настройка WebSocket сервера ---
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('Клиент подключился по WebSocket');

    // --- 4. Загружаем историю сообщений из БД ---
    // Используем JOIN, чтобы сразу получить и имя пользователя, и текст сообщения
    const sql = `
        SELECT m.content, u.username
        FROM messages m
        JOIN users u ON m.user_id = u.id
        ORDER BY m.created_at ASC
        LIMIT 50`; // Загружаем последние 50 сообщений

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Ошибка при загрузке истории сообщений:', err.message);
            return;
        }
        // Отправляем историю новому клиенту
        const history = rows.map(row => ({ username: row.username, text: row.content }));
        history.forEach(msg => ws.send(JSON.stringify(msg)));
    });

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        console.log('Получено сообщение:', parsedMessage);
        const { username, text } = parsedMessage;

        // --- 5. Сохраняем новое сообщение в БД ---
        // Сначала находим ID пользователя по его имени
        db.get(`SELECT id FROM users WHERE username = ?`, [username], (err, user) => {
            if (err || !user) {
                console.error('Не удалось найти пользователя для сохранения сообщения:', username);
                return;
            }
            
            // Теперь вставляем сообщение с ID пользователя
            db.run(`INSERT INTO messages (content, user_id) VALUES (?, ?)`, [text, user.id], function(err) {
                if (err) {
                    console.error('Ошибка при сохранении сообщения в БД:', err.message);
                    return;
                }

                // После успешного сохранения, рассылаем сообщение всем
                wss.clients.forEach((client) => {
                    if (client.readyState === client.OPEN) {
                        client.send(JSON.stringify(parsedMessage));
                    }
                });
            });
        });
    });

    ws.on('close', () => console.log('Клиент отключился'));
});

// --- Запуск сервера ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});