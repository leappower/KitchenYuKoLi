'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.CMS_JWT_SECRET || 'yukoli-cms-secret-2026';
const JWT_EXPIRES = '24h';

function generateToken(user) {
  return jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ error: 'Admin access required' });
    }
  });
}

function authRoutes(db) {
  const express = require('express');
  const router = express.Router();

  router.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = db.prepare('SELECT * FROM cms_users WHERE username = ?').get(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });

  router.post('/auth/change-password', requireAuth, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = db.prepare('SELECT * FROM cms_users WHERE id = ?').get(req.user.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE cms_users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, user.id);
    res.json({ message: 'Password changed' });
  });

  router.get('/auth/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, username, role, created_at FROM cms_users WHERE id = ?').get(req.user.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user });
  });

  return router;
}

module.exports = { authRoutes, requireAuth, requireAdmin };
