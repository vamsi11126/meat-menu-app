const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const bcrypt = require('bcrypt');
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

// POST /api/shops (create shop + its owner login - super admin only)
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  const {
    name,
    address,
    qr_code_url,
    business_type,
    description,
    owner_name,
    owner_email,
    owner_password,
  } = req.body;

  const shopName = typeof name === 'string' ? name.trim() : '';
  const shopAddress = typeof address === 'string' ? address.trim() : '';
  const ownerName = typeof owner_name === 'string' ? owner_name.trim() : '';
  const ownerEmail = typeof owner_email === 'string' ? owner_email.trim().toLowerCase() : '';

  if (!shopName || !shopAddress) {
    return res.status(400).json({ error: 'Name and address are required' });
  }
  if (!ownerName || !ownerEmail || !owner_password) {
    return res.status(400).json({ error: 'Owner name, email and password are required' });
  }
  if (String(owner_password).length < 6) {
    return res.status(400).json({ error: 'Owner password must be at least 6 characters' });
  }

  const client = await DB.connect();
  try {
    await client.query('BEGIN');

    // Reject duplicate owner email before creating the shop.
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [ownerEmail]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const shopResult = await client.query(
      `INSERT INTO shops (name, address, qr_code_url, business_type, description)
       VALUES ($1, $2, $3, COALESCE($4, 'daily_menu'), $5)
       RETURNING *`,
      [shopName, shopAddress, qr_code_url || '', business_type || null, description || null]
    );
    const shop = shopResult.rows[0];

    const passwordHash = await bcrypt.hash(String(owner_password), 10);
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, shop_id)
       VALUES ($1, $2, $3, 'shop_owner', $4)
       RETURNING id, name, email, role, shop_id`,
      [ownerName, ownerEmail, passwordHash, shop.id]
    );

    await client.query('COMMIT');

    // Never return the password hash.
    res.status(201).json({ ...shop, owner: userResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Shop creation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/shops (list all shops - super admin only)
router.get('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  try {
    // Join each shop's owner (one per shop) so the admin list can show
    // and edit owner name/email.
    const result = await DB.query(
      `SELECT s.*,
              o.id AS owner_id,
              o.name AS owner_name,
              o.email AS owner_email
       FROM shops s
       LEFT JOIN LATERAL (
         SELECT id, name, email
         FROM users
         WHERE shop_id = s.id AND role = 'shop_owner'
         ORDER BY id
         LIMIT 1
       ) o ON true
       ORDER BY s.created_at DESC`
    );
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

// GET /api/shops/:id (get single shop, incl. owner info for editing)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await DB.query(
      `SELECT s.*,
              o.id AS owner_id,
              o.name AS owner_name,
              o.email AS owner_email
       FROM shops s
       LEFT JOIN LATERAL (
         SELECT id, name, email
         FROM users
         WHERE shop_id = s.id AND role = 'shop_owner'
         ORDER BY id
         LIMIT 1
       ) o ON true
       WHERE s.id = $1`,
      [req.params.id]
    );
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

// PUT /api/shops/:id (super admin — edit shop + its owner)
router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  const shopId = Number(req.params.id);
  const {
    name,
    address,
    business_type,
    description,
    owner_name,
    owner_email,
    owner_password,
  } = req.body;

  // Build the shop update from provided fields only.
  const shopFields = [];
  const shopValues = [];
  let p = 1;

  if (name !== undefined) {
    const v = typeof name === 'string' ? name.trim() : '';
    if (!v) return res.status(400).json({ error: 'Shop name cannot be empty' });
    if (v.length > 100) return res.status(400).json({ error: 'Shop name must be 100 characters or fewer' });
    shopFields.push(`name = $${p++}`);
    shopValues.push(v);
  }
  if (address !== undefined) {
    const v = typeof address === 'string' ? address.trim() : '';
    if (!v) return res.status(400).json({ error: 'Address cannot be empty' });
    shopFields.push(`address = $${p++}`);
    shopValues.push(v);
  }
  if (business_type !== undefined) {
    if (business_type !== 'daily_menu' && business_type !== 'static_menu') {
      return res.status(400).json({ error: "business_type must be 'daily_menu' or 'static_menu'" });
    }
    shopFields.push(`business_type = $${p++}`);
    shopValues.push(business_type);
  }
  if (description !== undefined) {
    shopFields.push(`description = $${p++}`);
    shopValues.push(description === null ? null : String(description));
  }

  // Build the owner update from provided fields only.
  const ownerName = owner_name !== undefined ? String(owner_name).trim() : undefined;
  const ownerEmail = owner_email !== undefined ? String(owner_email).trim().toLowerCase() : undefined;
  if (ownerName !== undefined && !ownerName) {
    return res.status(400).json({ error: 'Owner name cannot be empty' });
  }
  if (ownerEmail !== undefined && !ownerEmail) {
    return res.status(400).json({ error: 'Owner email cannot be empty' });
  }
  if (owner_password !== undefined && String(owner_password).length < 6) {
    return res.status(400).json({ error: 'Owner password must be at least 6 characters' });
  }

  const client = await DB.connect();
  try {
    await client.query('BEGIN');

    const shopExists = await client.query('SELECT id FROM shops WHERE id = $1', [shopId]);
    if (shopExists.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Shop not found' });
    }

    if (shopFields.length > 0) {
      shopValues.push(shopId);
      await client.query(
        `UPDATE shops SET ${shopFields.join(', ')} WHERE id = $${p}`,
        shopValues
      );
    }

    // Resolve this shop's owner (if any) for owner-field updates.
    const ownerRow = await client.query(
      "SELECT id FROM users WHERE shop_id = $1 AND role = 'shop_owner' ORDER BY id LIMIT 1",
      [shopId]
    );
    const ownerId = ownerRow.rows[0] ? ownerRow.rows[0].id : null;

    const wantsOwnerUpdate =
      ownerName !== undefined || ownerEmail !== undefined || owner_password !== undefined;

    if (wantsOwnerUpdate) {
      if (!ownerId) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'This shop has no owner account to update' });
      }

      // Guard against assigning an email already used by a different account.
      if (ownerEmail !== undefined) {
        const clash = await client.query(
          'SELECT id FROM users WHERE email = $1 AND id <> $2',
          [ownerEmail, ownerId]
        );
        if (clash.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'An account with this email already exists' });
        }
      }

      const ownerFields = [];
      const ownerValues = [];
      let q = 1;
      if (ownerName !== undefined) {
        ownerFields.push(`name = $${q++}`);
        ownerValues.push(ownerName);
      }
      if (ownerEmail !== undefined) {
        ownerFields.push(`email = $${q++}`);
        ownerValues.push(ownerEmail);
      }
      if (owner_password !== undefined) {
        ownerFields.push(`password_hash = $${q++}`);
        ownerValues.push(await bcrypt.hash(String(owner_password), 10));
      }
      ownerValues.push(ownerId);
      await client.query(
        `UPDATE users SET ${ownerFields.join(', ')} WHERE id = $${q}`,
        ownerValues
      );
    }

    await client.query('COMMIT');

    // Return the fresh shop + owner view.
    const updated = await DB.query(
      `SELECT s.*, o.id AS owner_id, o.name AS owner_name, o.email AS owner_email
       FROM shops s
       LEFT JOIN LATERAL (
         SELECT id, name, email FROM users
         WHERE shop_id = s.id AND role = 'shop_owner' ORDER BY id LIMIT 1
       ) o ON true
       WHERE s.id = $1`,
      [shopId]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Shop update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/shops/:id (super admin — delete shop + its owner(s))
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  const shopId = Number(req.params.id);
  const client = await DB.connect();
  try {
    await client.query('BEGIN');

    const shopExists = await client.query('SELECT id, name FROM shops WHERE id = $1', [shopId]);
    if (shopExists.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Shop not found' });
    }

    // users.shop_id has no ON DELETE cascade, so remove owners first.
    // shop_categories / shop_items / daily_prices cascade automatically.
    await client.query('DELETE FROM users WHERE shop_id = $1', [shopId]);
    await client.query('DELETE FROM shops WHERE id = $1', [shopId]);

    await client.query('COMMIT');
    res.json({ message: 'Shop deleted', id: shopId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Shop delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
