const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
require('dotenv').config();

const authMiddleware = require('../middleware/auth');
const DB = require('../config/db');
const pricesRoutes = require('./prices');
const MENU_BASE_URL = process.env.MENU_BASE_URL || 'http://localhost:5173';

const ensureShopOwner = (req, res) => {
  if (req.user.role !== 'shop_owner') {
    res.status(403).json({ error: 'Shop owner access required' });
    return false;
  }

  return true;
};

// POST /api/shops (create shop - super admin only)
router.post('/', async (req, res) => {
  try {
    const { name, address, qr_code_url } = req.body;
    const qrCodeUrl = qr_code_url || '';

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    const result = await DB.query(
      'INSERT INTO shops (name, address, qr_code_url) VALUES ($1, $2, $3) RETURNING *',
      [name, address, qrCodeUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Shop creation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/shops (list all shops - super admin only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await DB.query('SELECT * FROM shops ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Shop list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/shops/me (get logged-in shop owner's shop)
router.get('/me', authMiddleware, async (req, res) => {
  if (!ensureShopOwner(req, res)) {
    return;
  }

  try {
    const result = await DB.query(
      `SELECT s.*
       FROM shops s
       INNER JOIN users u ON u.shop_id = s.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    const shop = result.rows[0];

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const qrData = `${MENU_BASE_URL}/menu/${shop.id}`;
    let qrCodeUrl = shop.qr_code_url;

    try {
      qrCodeUrl = await QRCode.toDataURL(qrData);
    } catch (qrErr) {
      qrCodeUrl = shop.qr_code_url;
    }

    res.json({ ...shop, qr_code_url: qrCodeUrl, qr_target_url: qrData });
  } catch (err) {
    console.error('Shop me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/shops/:id/prices (today's price, or the latest saved price if today is missing)
router.get('/:id/prices', async (req, res) => {
  try {
    const price = await pricesRoutes.getShopPriceForDisplay(req.params.id);

    if (!price) {
      return res.json([]);
    }

    res.json(price);
  } catch (err) {
    console.error('Shop prices lookup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/shops/:id (get single shop)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await DB.query('SELECT * FROM shops WHERE id = $1', [req.params.id]);
    const shop = result.rows[0];

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Generate QR code URL
    const qrData = `${MENU_BASE_URL}/menu/${shop.id}`;
    let qrCodeUrl = 'data:image/png;base64,';
    try {
      qrCodeUrl = await QRCode.toDataURL(qrData);
    } catch (qrErr) {
      // If QR generation fails, use placeholder
      qrCodeUrl = 'data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhGMIQAAAAt//ALf30w0mAAAAAElFTkSuQmCC';
    }

    res.json({ ...shop, qr_code_url: qrCodeUrl });
  } catch (err) {
    console.error('Shop get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
