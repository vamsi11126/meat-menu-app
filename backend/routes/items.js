const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const DB = require('../config/db');

const ensureShopOwner = (req, res) => {
  if (req.user.role !== 'shop_owner') {
    res.status(403).json({ error: 'Shop owner access required' });
    return false;
  }

  return true;
};

const getOwnerShopId = async (userId) => {
  const result = await DB.query(
    "SELECT shop_id FROM users WHERE id = $1 AND role = 'shop_owner'",
    [userId]
  );
  return result.rows[0] ? result.rows[0].shop_id : null;
};

// GET /api/shops/:id/items (public)
// All items for a shop with their category, ordered by category then item order.
router.get('/shops/:id/items', async (req, res) => {
  try {
    const result = await DB.query(
      `SELECT i.id,
              i.shop_id,
              i.category_id,
              c.name AS category_name,
              c.display_order AS category_display_order,
              i.name,
              i.price,
              i.unit,
              i.is_available,
              i.display_order,
              i.created_at,
              i.updated_at
       FROM shop_items i
       LEFT JOIN shop_categories c ON c.id = i.category_id
       WHERE i.shop_id = $1
       ORDER BY COALESCE(c.display_order, 2147483647), c.id,
                i.display_order, i.id`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Items list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/shops/me/items (shop owner only — create item)
router.post('/shops/me/items', authMiddleware, async (req, res) => {
  if (!ensureShopOwner(req, res)) {
    return;
  }

  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const price = req.body.price === undefined ? 0 : Number(req.body.price);
    const unit = typeof req.body.unit === 'string' && req.body.unit.trim()
      ? req.body.unit.trim()
      : 'per glass';
    const categoryId = req.body.category_id === undefined || req.body.category_id === null
      ? null
      : Number(req.body.category_id);
    const displayOrder = Number.isFinite(Number(req.body.display_order))
      ? Number(req.body.display_order)
      : 0;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name must be 100 characters or fewer' });
    }
    if (Number.isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Price must be a non-negative number' });
    }
    if (categoryId !== null && !Number.isInteger(categoryId)) {
      return res.status(400).json({ error: 'category_id must be an integer' });
    }

    const shopId = await getOwnerShopId(req.user.id);
    if (!shopId) {
      return res.status(404).json({ error: 'Shop not found for user' });
    }

    // If a category is given, it must belong to this shop.
    if (categoryId !== null) {
      const cat = await DB.query(
        'SELECT id FROM shop_categories WHERE id = $1 AND shop_id = $2',
        [categoryId, shopId]
      );
      if (cat.rows.length === 0) {
        return res.status(400).json({ error: 'Category does not belong to this shop' });
      }
    }

    const result = await DB.query(
      `INSERT INTO shop_items (shop_id, category_id, name, price, unit, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [shopId, categoryId, name, price, unit, displayOrder]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Item create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/shops/me/items/:itemId (shop owner only — update item)
router.put('/shops/me/items/:itemId', authMiddleware, async (req, res) => {
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

    if (req.body.price !== undefined) {
      const price = Number(req.body.price);
      if (Number.isNaN(price) || price < 0) {
        return res.status(400).json({ error: 'Price must be a non-negative number' });
      }
      fields.push(`price = $${idx++}`);
      values.push(price);
    }

    if (req.body.unit !== undefined) {
      const unit = typeof req.body.unit === 'string' ? req.body.unit.trim() : '';
      if (!unit) {
        return res.status(400).json({ error: 'Unit cannot be empty' });
      }
      fields.push(`unit = $${idx++}`);
      values.push(unit);
    }

    if (req.body.category_id !== undefined) {
      const categoryId = req.body.category_id === null ? null : Number(req.body.category_id);
      if (categoryId !== null) {
        if (!Number.isInteger(categoryId)) {
          return res.status(400).json({ error: 'category_id must be an integer or null' });
        }
        const cat = await DB.query(
          'SELECT id FROM shop_categories WHERE id = $1 AND shop_id = $2',
          [categoryId, shopId]
        );
        if (cat.rows.length === 0) {
          return res.status(400).json({ error: 'Category does not belong to this shop' });
        }
      }
      fields.push(`category_id = $${idx++}`);
      values.push(categoryId);
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

    fields.push('updated_at = NOW()');
    values.push(req.params.itemId, shopId);
    const result = await DB.query(
      `UPDATE shop_items SET ${fields.join(', ')}
       WHERE id = $${idx++} AND shop_id = $${idx}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Item update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/shops/me/items/:itemId (shop owner only)
router.delete('/shops/me/items/:itemId', authMiddleware, async (req, res) => {
  if (!ensureShopOwner(req, res)) {
    return;
  }

  try {
    const shopId = await getOwnerShopId(req.user.id);
    if (!shopId) {
      return res.status(404).json({ error: 'Shop not found for user' });
    }

    const result = await DB.query(
      'DELETE FROM shop_items WHERE id = $1 AND shop_id = $2 RETURNING id',
      [req.params.itemId, shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('Item delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/shops/me/items/:itemId/availability (shop owner only — toggle availability)
router.patch('/shops/me/items/:itemId/availability', authMiddleware, async (req, res) => {
  if (!ensureShopOwner(req, res)) {
    return;
  }

  try {
    if (typeof req.body.is_available !== 'boolean') {
      return res.status(400).json({ error: 'is_available must be a boolean' });
    }

    const shopId = await getOwnerShopId(req.user.id);
    if (!shopId) {
      return res.status(404).json({ error: 'Shop not found for user' });
    }

    const result = await DB.query(
      `UPDATE shop_items SET is_available = $1, updated_at = NOW()
       WHERE id = $2 AND shop_id = $3
       RETURNING *`,
      [req.body.is_available, req.params.itemId, shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Item availability error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
