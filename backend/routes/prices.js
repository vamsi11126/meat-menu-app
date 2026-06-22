const express = require('express');
const router = express.Router();

const DB = require('../config/db');

// Today's date in Asia/Kolkata, as YYYY-MM-DD (used for daily_menu price rows).
const getTodayDate = async () => {
  const result = await DB.query(
    "SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS today"
  );
  return result.rows[0].today;
};

// Resolve a shop's business_type (defaults to 'daily_menu').
const getShopBusinessType = async (shopId) => {
  const result = await DB.query(
    'SELECT id, name, business_type FROM shops WHERE id = $1',
    [shopId]
  );
  return result.rows[0] || null;
};

// Public read of a shop's menu prices, resolved per business_type.
// Returns one row per item with a `price` field plus item/category metadata.
//   - static_menu: price comes straight from shop_items.price
//   - daily_menu:  price comes from today's daily_prices row, falling back to
//                  the most recent prior daily_prices row for that item.
const getPricesForShop = async (shopId) => {
  const shop = await getShopBusinessType(shopId);
  if (!shop) {
    return null;
  }

  if (shop.business_type === 'static_menu') {
    const result = await DB.query(
      `SELECT i.id AS item_id,
              i.name,
              i.unit,
              i.is_available,
              i.category_id,
              c.name AS category_name,
              i.display_order,
              i.price,
              i.updated_at
       FROM shop_items i
       LEFT JOIN shop_categories c ON c.id = i.category_id
       WHERE i.shop_id = $1
       ORDER BY COALESCE(c.display_order, 2147483647), c.id,
                i.display_order, i.id`,
      [shopId]
    );
    return { shop_id: Number(shopId), shop_name: shop.name, business_type: shop.business_type, items: result.rows };
  }

  // daily_menu: pick today's price per item, else the latest prior price.
  const today = await getTodayDate();
  const result = await DB.query(
    `SELECT i.id AS item_id,
            i.name,
            i.unit,
            i.is_available,
            i.category_id,
            c.name AS category_name,
            i.display_order,
            latest.price,
            latest.date AS price_date,
            latest.updated_at
     FROM shop_items i
     LEFT JOIN shop_categories c ON c.id = i.category_id
     LEFT JOIN LATERAL (
       SELECT dp.price, dp.date, dp.updated_at
       FROM daily_prices dp
       WHERE dp.item_id = i.id
       ORDER BY
         CASE WHEN dp.date = $2::date THEN 0 ELSE 1 END,
         dp.date DESC,
         dp.updated_at DESC
       LIMIT 1
     ) latest ON true
     WHERE i.shop_id = $1
     ORDER BY COALESCE(c.display_order, 2147483647), c.id,
              i.display_order, i.id`,
    [shopId, today]
  );
  return { shop_id: Number(shopId), shop_name: shop.name, business_type: shop.business_type, items: result.rows };
};

// Owner write of prices. `prices` is [{ item_id, price }, ...].
//   - static_menu: writes price onto shop_items
//   - daily_menu:  upserts today's row in daily_prices
// Only items belonging to the owner's shop are accepted.
const setPricesForOwner = async (userId, prices) => {
  if (!Array.isArray(prices) || prices.length === 0) {
    return { error: 'prices must be a non-empty array of { item_id, price }', status: 400 };
  }

  const normalized = [];
  for (const entry of prices) {
    const itemId = Number(entry && entry.item_id);
    const price = Number(entry && entry.price);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return { error: 'Each price entry requires a valid item_id', status: 400 };
    }
    if (Number.isNaN(price) || price < 0) {
      return { error: 'Each price must be a non-negative number', status: 400 };
    }
    normalized.push({ itemId, price });
  }

  const shopResult = await DB.query(
    `SELECT s.id, s.business_type
     FROM users u
     INNER JOIN shops s ON s.id = u.shop_id
     WHERE u.id = $1 AND u.role = 'shop_owner'`,
    [userId]
  );
  if (shopResult.rows.length === 0) {
    return { error: 'Shop not found for user', status: 404 };
  }
  const shop = shopResult.rows[0];

  // Ensure every item_id belongs to this shop before writing anything.
  const itemIds = normalized.map((p) => p.itemId);
  const owned = await DB.query(
    'SELECT id FROM shop_items WHERE shop_id = $1 AND id = ANY($2::int[])',
    [shop.id, itemIds]
  );
  const ownedIds = new Set(owned.rows.map((r) => r.id));
  const foreign = itemIds.filter((id) => !ownedIds.has(id));
  if (foreign.length > 0) {
    return { error: `Items do not belong to this shop: ${foreign.join(', ')}`, status: 403 };
  }

  if (shop.business_type === 'static_menu') {
    for (const { itemId, price } of normalized) {
      await DB.query(
        'UPDATE shop_items SET price = $1, updated_at = NOW() WHERE id = $2 AND shop_id = $3',
        [price, itemId, shop.id]
      );
    }
  } else {
    const today = await getTodayDate();
    for (const { itemId, price } of normalized) {
      await DB.query(
        `INSERT INTO daily_prices (shop_id, item_id, date, price, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (shop_id, item_id, date)
         DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()`,
        [shop.id, itemId, today, price]
      );
    }
  }

  const updated = await getPricesForShop(shop.id);
  return { data: updated, status: 200 };
};

// Helpers consumed by routes/shops.js (the /api/shops/:id/prices and
// /api/shops/me/prices endpoints live under the /api/shops prefix).
router.getPricesForShop = getPricesForShop;
router.setPricesForOwner = setPricesForOwner;
router.getShopBusinessType = getShopBusinessType;

module.exports = router;
