import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, 'flashmaster.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        theme TEXT DEFAULT 'dark',
        pfp TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        // Try to add pfp column if it doesn't exist (migration)
        if (!err) {
          db.run(`ALTER TABLE users ADD COLUMN pfp TEXT`, (alterErr) => {
            // Ignore error if column already exists
          });
        }
      });

      // Decks table
      db.run(`CREATE TABLE IF NOT EXISTS decks (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        colorId INTEGER DEFAULT 0,
        lastStudiedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
      )`);

      // Cards table
      db.run(`CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        deckId TEXT NOT NULL,
        term TEXT NOT NULL,
        definition TEXT NOT NULL,
        FOREIGN KEY(deckId) REFERENCES decks(id) ON DELETE CASCADE
      )`);

      // Tags table
      db.run(`CREATE TABLE IF NOT EXISTS tags (
        deckId TEXT NOT NULL,
        tag TEXT NOT NULL,
        FOREIGN KEY(deckId) REFERENCES decks(id) ON DELETE CASCADE,
        UNIQUE(deckId, tag)
      )`);

      // Study history table
      db.run(`CREATE TABLE IF NOT EXISTS study_history (
        userId TEXT NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(userId, date)
      )`);
    });
  }
});

// Helper for promise-based queries
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export default db;
