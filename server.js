// server.js
import http from 'http';
import fs from 'fs/promises'; // Используем асинхронную версию fs
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws'; // Импортируем WebSocket сервер

// --- Настройка путей ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Хранилище данных в памяти (для простоты) ---
const users = new Set();
const messages = [];

// --- Создание HTTP сервера ---
const server = http.createServer(async (req, res) => {
    console.log(`HTTP Запрос: ${req.method} ${req.url}`);

    // Роутинг для API
    if (req.url === '/api/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { username } = JSON.parse(body);
                if (users.has(username)) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Такой никнейм уже занят' }));
                } else {
                    users.add(username);
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Регистрация успешна' }));
                }
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Неверный формат запроса' }));
            }
        });
        return;
    }

    // --- Логика раздачи статических файлов ---
    const getContentType = (filePath) => {
        const extname = path.extname(filePath);
        switch (extname) {
            case '.js': return 'text/javascript';
            case '.css': return 'text/css';
            case '.html': return 'text/html';
            default: return 'application/octet-stream';
        }
    };

    let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    
    // Если пользователь не "залогинен" (просто проверяем URL), отправляем на регистрацию
    if (req.url === '/') {
       filePath = path.join(__dirname, 'public', 'index.html');
    }

    try {
        const content = await fs.readFile(filePath);
        res.writeHead(200, { 'Content-Type': getContentType(filePath) });
        res.end(content, 'utf-8');
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
        } else {
            res.writeHead(500);
            res.end(`Server Error: ${err.code}`);
        }
    }
});

// --- Создание и настройка WebSocket сервера ---
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('Клиент подключился по WebSocket');

    // Отправляем новому клиенту историю сообщений
    messages.forEach(msg => ws.send(JSON.stringify(msg)));

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        console.log('Получено сообщение:', parsedMessage);

        // Добавляем сообщение в историю
        messages.push(parsedMessage);
        // Ограничим историю, чтобы не занимать всю память
        if (messages.length > 50) {
            messages.shift();
        }

        // Рассылаем сообщение всем подключенным клиентам
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