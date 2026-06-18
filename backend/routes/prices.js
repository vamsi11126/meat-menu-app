const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const DB = require('../config/db');

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getShopPriceForDisplay = async (shopId) => {
  const result = await DB.query(
    `SELECT dp.*,
            s.name AS shop_name
     FROM daily_prices dp
     LEFT JOIN shops s ON s.id = dp.shop_id
     WHERE dp.shop_id = $1
     ORDER BY
       CASE
         WHEN DATE(dp.updated_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE AT TIME ZONE 'Asia/Kolkata' THEN 0
         ELSE 1
       END,
       dp.updated_at DESC
     LIMIT 1`,
    [shopId]
  );

  return result.rows[0] || null;
};

const ensureShopOwner = (req, res) => {
  if (req.user.role !== 'shop_owner') {
    res.status(403).json({ error: 'Shop owner access required' });
    return false;
  }

  return true;
};

// GET /api/prices/shop/:shopId (list prices for a shop)
router.get('/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;

    const price = await getShopPriceForDisplay(shopId);

    if (!price) {
      return res.json([]);
    }

    res.json(price);
  } catch (err) {
    console.error('Prices error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/prices/me/today (logged-in shop owner's prices for today)
router.get('/me/today', authMiddleware, async (req, res) => {
  if (!ensureShopOwner(req, res)) {
    return;
  }

  try {
    const today = getTodayDate();
    const result = await DB.query(
      `SELECT dp.*,
              s.name AS shop_name,
              s.address
       FROM users u
       INNER JOIN shops s ON s.id = u.shop_id
       LEFT JOIN daily_prices dp ON dp.shop_id = s.id AND dp.date = $2
       WHERE u.id = $1`,
      [req.user.id, today]
    );

    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({ error: 'Shop not found for user' });
    }

    res.json({
      shop_id: row.shop_id || req.user.shop_id,
      shop_name: row.shop_name,
      address: row.address,
      date: row.date || today,
      chicken_kg: row.chicken_kg ?? 0,
      mutton_kg: row.mutton_kg ?? 0,
      fish_kg: row.fish_kg ?? 0,
      eggs_kg: row.eggs_kg ?? 0,
      updated_at: row.updated_at || null,
    });
  } catch (err) {
    console.error('Owner today prices error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/prices/me/today (upsert today's prices for logged-in shop owner)
router.put('/me/today', authMiddleware, async (req, res) => {
  if (!ensureShopOwner(req, res)) {
    return;
  }

  try {
    const { chicken_kg, mutton_kg, fish_kg, eggs_kg } = req.body;
    const numericPrices = {
      chicken_kg: Number(chicken_kg),
      mutton_kg: Number(mutton_kg),
      fish_kg: Number(fish_kg),
      eggs_kg: Number(eggs_kg),
    };

    if (Object.values(numericPrices).some((value) => Number.isNaN(value) || value < 0)) {
      return res.status(400).json({ error: 'All price fields must be valid non-negative numbers' });
    }

    const shopResult = await DB.query(
      'SELECT shop_id FROM users WHERE id = $1 AND role = $2',
      [req.user.id, 'shop_owner']
    );

    if (shopResult.rows.length === 0 || !shopResult.rows[0].shop_id) {
      return res.status(404).json({ error: 'Shop not found for user' });
    }

    const today = getTodayDate();
    const shopId = shopResult.rows[0].shop_id;
    const result = await DB.query(
      `INSERT INTO daily_prices (
         shop_id,
         date,
         chicken_kg,
         mutton_kg,
         fish_kg,
         eggs_kg,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (shop_id, date)
       DO UPDATE SET
         chicken_kg = EXCLUDED.chicken_kg,
         mutton_kg = EXCLUDED.mutton_kg,
         fish_kg = EXCLUDED.fish_kg,
         eggs_kg = EXCLUDED.eggs_kg,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        shopId,
        today,
        numericPrices.chicken_kg,
        numericPrices.mutton_kg,
        numericPrices.fish_kg,
        numericPrices.eggs_kg,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Owner price update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/prices/today (list today's prices for all shops)
router.get('/today', async (req, res) => {
  try {
    const today = getTodayDate();

    const result = await DB.query(
      `SELECT dp.*,
              (SELECT s.name FROM shops s WHERE s.id = dp.shop_id) as shop_name
       FROM daily_prices dp
       LEFT JOIN shops s ON s.id = dp.shop_id
       WHERE dp.date = $1
       ORDER BY s.name`,
      [today]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Today prices error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.getShopPriceForDisplay = getShopPriceForDisplay;

module.exports = router;
