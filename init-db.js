import sqlite3 from 'sqlite3';

// Создаем или открываем файл базы данных
const db = new sqlite3.Database('./chat.db', (err) => {
    if (err) {
        console.error('Ошибка при открытии базы данных', err.message);
    } else {
        console.log('Успешное подключение к базе данных SQLite.');
        createTables();
    }
});

function createTables() {
    // Используем serialize для последовательного выполнения запросов
    db.serialize(() => {
        // Создаем таблицу пользователей, если она не существует
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Ошибка при создании таблицы 'users'", err.message);
            } else {
                console.log("Таблица 'users' успешно создана или уже существует.");
            }
        });

        // Создаем таблицу сообщений, если она не существует
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`, (err) => {
            if (err) {
                console.error("Ошибка при создании таблицы 'messages'", err.message);
            } else {
                console.log("Таблица 'messages' успешно создана или уже существует.");
            }
        });
    });

    // Закрываем соединение с БД после выполнения всех запросов
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Соединение с базой данных закрыто.');
    });
}