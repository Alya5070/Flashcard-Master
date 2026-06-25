import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, run } from './db.js';
import crypto from 'crypto';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const JWT_SECRET = 'super_secret_flashmaster_key_123';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const existing = await query('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(400).json({ error: 'Username taken' });

    const hash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    
    await run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [userId, username, hash]);
    
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: userId, username, theme: 'dark', pfp: null } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const users = await query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, theme: user.theme, pfp: user.pfp } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const users = await query('SELECT id, username, theme, pfp FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const historyRows = await query('SELECT date FROM study_history WHERE userId = ?', [req.user.id]);
    const studyHistory = historyRows.map(r => r.date);

    res.json({ user: users[0], studyHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  const { theme, username, pfp } = req.body;
  try {
    if (theme) await run('UPDATE users SET theme = ? WHERE id = ?', [theme, req.user.id]);
    if (username) await run('UPDATE users SET username = ? WHERE id = ?', [username, req.user.id]);
    if (pfp !== undefined) await run('UPDATE users SET pfp = ? WHERE id = ?', [pfp, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/study', authenticateToken, async (req, res) => {
  const { date } = req.body;
  try {
    await run('INSERT OR IGNORE INTO study_history (userId, date) VALUES (?, ?)', [req.user.id, date]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DECK ROUTES ---

app.get('/api/decks', authenticateToken, async (req, res) => {
  try {
    const decks = await query('SELECT * FROM decks WHERE userId = ?', [req.user.id]);
    
    // Fetch all cards and tags for these decks
    const deckIds = decks.map(d => `'${d.id}'`).join(',');
    let cards = [];
    let tags = [];
    
    if (deckIds) {
      cards = await query(`SELECT * FROM cards WHERE deckId IN (${deckIds})`);
      tags = await query(`SELECT * FROM tags WHERE deckId IN (${deckIds})`);
    }

    const fullDecks = decks.map(d => ({
      ...d,
      cards: cards.filter(c => c.deckId === d.id).map(c => ({ id: c.id, term: c.term, definition: c.definition })),
      tags: tags.filter(t => t.deckId === d.id).map(t => t.tag)
    }));

    res.json(fullDecks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/decks', authenticateToken, async (req, res) => {
  const { name, colorId, cards, tags } = req.body;
  const deckId = crypto.randomUUID();
  const date = new Date().toISOString();

  try {
    await run('INSERT INTO decks (id, userId, name, colorId, createdAt) VALUES (?, ?, ?, ?, ?)', 
      [deckId, req.user.id, name, colorId || 0, date]);

    for (const card of cards) {
      const cardId = card.id || crypto.randomUUID();
      await run('INSERT INTO cards (id, deckId, term, definition) VALUES (?, ?, ?, ?)', 
        [cardId, deckId, card.term, card.definition]);
    }

    for (const tag of tags) {
      await run('INSERT INTO tags (deckId, tag) VALUES (?, ?)', [deckId, tag]);
    }

    res.json({ id: deckId, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/decks/:id', authenticateToken, async (req, res) => {
  const deckId = req.params.id;
  const { name, cards, tags, lastStudiedAt } = req.body;

  try {
    // Verify ownership
    const deck = await query('SELECT id FROM decks WHERE id = ? AND userId = ?', [deckId, req.user.id]);
    if (deck.length === 0) return res.status(403).json({ error: 'Unauthorized' });

    if (name) await run('UPDATE decks SET name = ? WHERE id = ?', [name, deckId]);
    if (lastStudiedAt) await run('UPDATE decks SET lastStudiedAt = ? WHERE id = ?', [lastStudiedAt, deckId]);

    if (cards) {
      await run('DELETE FROM cards WHERE deckId = ?', [deckId]);
      for (const card of cards) {
        const cardId = card.id || crypto.randomUUID();
        await run('INSERT INTO cards (id, deckId, term, definition) VALUES (?, ?, ?, ?)', 
          [cardId, deckId, card.term, card.definition]);
      }
    }

    if (tags) {
      await run('DELETE FROM tags WHERE deckId = ?', [deckId]);
      for (const tag of tags) {
        await run('INSERT INTO tags (deckId, tag) VALUES (?, ?)', [deckId, tag]);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/decks/:id', authenticateToken, async (req, res) => {
  const deckId = req.params.id;
  try {
    const deck = await query('SELECT id FROM decks WHERE id = ? AND userId = ?', [deckId, req.user.id]);
    if (deck.length === 0) return res.status(403).json({ error: 'Unauthorized' });

    await run('DELETE FROM decks WHERE id = ?', [deckId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
