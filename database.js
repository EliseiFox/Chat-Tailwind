import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Эта асинхронная функция будет открывать соединение с БД
// и создавать таблицы, если их еще нет.
export async function openDb() {
    const db = await open({
        filename: './chat.db', // Имя файла нашей БД
        driver: sqlite3.Database
    });

    // migrate() - хороший паттерн, чтобы убедиться, что таблицы существуют
    await db.migrate({
        // force: 'last' // можно использовать для отладки, чтобы пересоздавать таблицы
        migrationsPath: './migrations' // папка для файлов миграций (опционально, но хорошая практика)
    });

    console.log('База данных успешно подключена и таблицы созданы.');
    return db;
}


// Для простоты, вместо миграций, можно создать таблицы прямо здесь:
export async function initializeDb() {
    const db = await open({
        filename: './chat.db',
        driver: sqlite3.Database
    });

    // SQL-запрос для создания таблицы пользователей
    // IF NOT EXISTS - чтобы не было ошибки при повторном запуске
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // SQL-запрос для создания таблицы сообщений
    await db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('База данных успешно инициализирована.');
    return db;
}