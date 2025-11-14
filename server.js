// Импортируем встроенные модули Node.js
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Получение __dirname в ES-модулях ---
// import.meta.url содержит URL текущего файла
// fileURLToPath преобразует этот URL в обычный путь файловой системы
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -----------------------------------------

// Данные, которые мы будем отдавать как API
const linksData = [
    { title: 'Мой GitHub', url: 'https://github.com' },
    { title: 'Профиль на LinkedIn', url: 'https://linkedin.com' },
    { title: 'Портфолио', url: 'https://example.com' },
];

const server = http.createServer((req, res) => {
    console.log(`Запрос: ${req.method} ${req.url}`);

    if (req.method === 'GET') {
        if (req.url === '/api/links') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(linksData));
            return;
        }

        let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
        
        const extname = path.extname(filePath);
        let contentType = 'text/html';
        switch (extname) {
            case '.js':
                contentType = 'text/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.json':
                contentType = 'application/json';
                break;
        }

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code == 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1>');
                } else {
                    res.writeHead(500);
                    res.end(`Server Error: ${err.code}`);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });

    } else {
        res.writeHead(405, { 'Content-Type': 'text/html' });
        res.end('<h1>405 Method Not Allowed</h1>');
    }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}...`);
    console.log(`Откройте http://localhost:${PORT} в браузере`);
});