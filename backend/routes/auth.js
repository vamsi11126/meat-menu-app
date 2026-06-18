const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const authMiddleware = require('../middleware/auth');
const DB = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await DB.query(
      'SELECT id, name, email, password_hash, role, shop_id FROM users WHERE email = $1',
      [email]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, shop_id: user.shop_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shop_id: user.shop_id,
      },
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await DB.query(
      'SELECT id, name, email, role, shop_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
