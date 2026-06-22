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

// Resolve the shop_id owned by the logged-in shop owner.
const getOwnerShopId = async (userId) => {
  const result = await DB.query(
    "SELECT shop_id FROM users WHERE id = $1 AND role = 'shop_owner'",
    [userId]
  );
  return result.rows[0] ? result.rows[0].shop_id : null;
};

// POST /api/shops (create shop - super admin only)
router.post('/', async (req, res) => {
  try {
    const { name, address, qr_code_url, business_type, description } = req.body;
    const qrCodeUrl = qr_code_url || '';

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    const result = await DB.query(
      `INSERT INTO shops (name, address, qr_code_url, business_type, description)
       VALUES ($1, $2, $3, COALESCE($4, 'daily_menu'), $5)
       RETURNING *`,
      [name, address, qrCodeUrl, business_type || null, description || null]
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

// GET /api/shops/me (get logged-in shop owner's shop, incl. business_type)
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

    // shop.* already includes business_type and description after the schema migration.
    res.json({ ...shop, qr_code_url: qrCodeUrl, qr_target_url: qrData });
  } catch (err) {
    console.error('Shop me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/shops/me/name (shop owner only — update shop display name)
router.put('/me/name', authMiddleware, async (req, res) => {
  if (!ensureShopOwner(req, res)) {
    return;
  }

  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name must be 100 characters or fewer' });
    }

    const shopId = await getOwnerShopId(req.user.id);
    if (!shopId) {
      return res.status(404).json({ error: 'Shop not found for user' });
    }

    const result = await DB.query(
      'UPDATE shops SET name = $1 WHERE id = $2 RETURNING *',
      [name, shopId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Shop name update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/shops/me/categories (shop owner only — create category)
router.post('/me/categories', authMiddleware, async (req, res) => {
  if (!ensureShopOwner(req, res)) {
    return;
  }

  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const displayOrder = Number.isFinite(Number(req.body.display_order))
      ? Number(req.body.display_order)
      : 0;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name must be 100 characters or fewer' });
    }

    const shopId = await getOwnerShopId(req.user.id);
    if (!shopId) {
      return res.status(404).json({ error: 'Shop not found for user' });
    }

    const result = await DB.query(
      `INSERT INTO shop_categories (shop_id, name, display_order)
       VALUES ($1, $2, $3) RETURNING *`,
      [shopId, name, displayOrder]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Category create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/shops/me/categories/:categoryId (shop owner only — update category)
router.put('/me/categories/:categoryId', authMiddleware, async (req, res) => {
  if (!ensureShopOwner(req, res)) {
    return;
  }

  try {
    const shopId = await getOwnerShopId(req.user.id);
    if (!shopId) {
      return res.status(404).json({ error: 'Shop not found for user' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (req.body.name !== undefined) {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      if (!name) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      if (name.length > 100) {
        return res.status(400).json({ error: 'Name must be 100 characters or fewer' });
      }
      fields.push(`name = $${idx++}`);
      values.push(name);
    }

    if (req.body.display_order !== undefined) {
      const displayOrder = Number(req.body.display_order);
      if (!Number.isFinite(displayOrder)) {
        return res.status(400).json({ error: 'display_order must be a number' });
      }
      fields.push(`display_order = $${idx++}`);
      values.push(displayOrder);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    values.push(req.params.categoryId, shopId);
    const result = await DB.query(
      `UPDATE shop_categories SET ${fields.join(', ')}
       WHERE id = $${idx++} AND shop_id = $${idx}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Category update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/shops/me/categories/:categoryId (shop owner only)
// Items in this category have category_id set to NULL via FK ON DELETE SET NULL.
router.delete('/me/categories/:categoryId', authMiddleware, async (req, res) => {
  if (!ensureShopOwner(req, res)) {
    return;
  }

  try {
    const shopId = await getOwnerShopId(req.user.id);
    if (!shopId) {
      return res.status(404).json({ error: 'Shop not found for user' });
    }

    const result = await DB.query(
      'DELETE FROM shop_categories WHERE id = $1 AND shop_id = $2 RETURNING id',
      [req.params.categoryId, shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('Category delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/shops/me/prices (shop owner only — set prices, behavior per business_type)
router.post('/me/prices', authMiddleware, async (req, res) => {
  if (!ensureShopOwner(req, res)) {
    return;
  }

  try {
    const result = await pricesRoutes.setPricesForOwner(req.user.id, req.body.prices);
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    console.error('Set prices error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/shops/:id/categories (public — categories ordered by display_order)
router.get('/:id/categories', async (req, res) => {
  try {
    const result = await DB.query(
      `SELECT * FROM shop_categories
       WHERE shop_id = $1
       ORDER BY display_order, id`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Categories list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/shops/:id/prices (public — resolved prices, behavior per business_type)
router.get('/:id/prices', async (req, res) => {
  try {
    const prices = await pricesRoutes.getPricesForShop(req.params.id);

    if (!prices) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    res.json(prices);
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
