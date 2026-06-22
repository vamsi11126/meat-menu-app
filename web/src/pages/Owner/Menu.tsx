import { useEffect, useMemo, useState } from 'react';
import OwnerNav from '../../components/OwnerNav';
import { useAuth } from '../../context/AuthContext';
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  fetchCategories,
  fetchItems,
  fetchMyShop,
  formatPrice,
  getErrorMessage,
  setItemAvailability,
  updateCategory,
  updateItem,
  UNIT_OPTIONS,
  type Category,
  type Item,
} from '../../api/menu';

type ItemDraft = {
  name: string;
  price: string;
  unit: string;
  category_id: string; // '' = uncategorized
};

const emptyItemDraft: ItemDraft = {
  name: '',
  price: '',
  unit: UNIT_OPTIONS[0],
  category_id: '',
};

const sortByOrder = <T extends { display_order: number; id: number }>(rows: T[]) =>
  [...rows].sort((a, b) => a.display_order - b.display_order || a.id - b.id);

const Menu = () => {
  const { user } = useAuth();
  const [shopId, setShopId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Category UI state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Item UI state
  const [filterCategory, setFilterCategory] = useState<string>('all'); // 'all' | 'none' | id
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState<ItemDraft>(emptyItemDraft);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(emptyItemDraft);

  const loadAll = async (id: number) => {
    const [cats, its] = await Promise.all([fetchCategories(id), fetchItems(id)]);
    setCategories(sortByOrder(cats));
    setItems(its);
  };

  useEffect(() => {
    const init = async () => {
      if (!user?.shop_id) {
        setError('No shop is assigned to this owner account.');
        setIsLoading(false);
        return;
      }
      try {
        const shop = await fetchMyShop();
        setShopId(shop.id);
        await loadAll(shop.id);
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load menu.'));
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [user?.shop_id]);

  const reload = async () => {
    if (shopId) await loadAll(shopId);
  };

  const sortedCategories = useMemo(() => sortByOrder(categories), [categories]);

  const filteredItems = useMemo(() => {
    if (filterCategory === 'all') return items;
    if (filterCategory === 'none') return items.filter((i) => i.category_id === null);
    return items.filter((i) => String(i.category_id) === filterCategory);
  }, [items, filterCategory]);

  // --- Category actions ---

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setError('');
    try {
      const nextOrder = categories.length
        ? Math.max(...categories.map((c) => c.display_order)) + 1
        : 1;
      await createCategory(name, nextOrder);
      setNewCategoryName('');
      await reload();
    } catch (e) {
      setError(getErrorMessage(e, 'Unable to add category.'));
    }
  };

  const beginEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const saveCategoryName = async (category: Category) => {
    const name = editingCategoryName.trim();
    setEditingCategoryId(null);
    if (!name || name === category.name) return;
    setError('');
    try {
      await updateCategory(category.id, { name });
      await reload();
    } catch (e) {
      setError(getErrorMessage(e, 'Unable to rename category.'));
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    const confirmed = window.confirm(
      `Delete category "${category.name}"?\n\nIts items will NOT be deleted — they become uncategorized.`,
    );
    if (!confirmed) return;
    setError('');
    try {
      await deleteCategory(category.id);
      await reload();
    } catch (e) {
      setError(getErrorMessage(e, 'Unable to delete category.'));
    }
  };

  // Swap display_order with the neighbour in the given direction.
  const moveCategory = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sortedCategories.length) return;
    const a = sortedCategories[index];
    const b = sortedCategories[target];
    setError('');
    try {
      await Promise.all([
        updateCategory(a.id, { display_order: b.display_order }),
        updateCategory(b.id, { display_order: a.display_order }),
      ]);
      await reload();
    } catch (e) {
      setError(getErrorMessage(e, 'Unable to reorder categories.'));
    }
  };

  // --- Item actions ---

  const handleAddItem = async () => {
    const name = newItem.name.trim();
    const price = Number(newItem.price);
    if (!name) {
      setError('Item name is required.');
      return;
    }
    if (newItem.price.trim() === '' || Number.isNaN(price) || price < 0) {
      setError('Item price must be a valid non-negative number.');
      return;
    }
    setError('');
    try {
      const sameCat = items.filter((i) => String(i.category_id ?? '') === newItem.category_id);
      const nextOrder = sameCat.length ? Math.max(...sameCat.map((i) => i.display_order)) + 1 : 1;
      await createItem({
        name,
        price,
        unit: newItem.unit,
        category_id: newItem.category_id === '' ? null : Number(newItem.category_id),
        display_order: nextOrder,
      });
      setNewItem(emptyItemDraft);
      setShowAddItem(false);
      await reload();
    } catch (e) {
      setError(getErrorMessage(e, 'Unable to add item.'));
    }
  };

  const beginEditItem = (item: Item) => {
    setEditingItemId(item.id);
    setItemDraft({
      name: item.name,
      price: String(item.price),
      unit: item.unit,
      category_id: item.category_id === null ? '' : String(item.category_id),
    });
  };

  const saveItem = async (item: Item) => {
    const name = itemDraft.name.trim();
    const price = Number(itemDraft.price);
    if (!name) {
      setError('Item name is required.');
      return;
    }
    if (itemDraft.price.trim() === '' || Number.isNaN(price) || price < 0) {
      setError('Item price must be a valid non-negative number.');
      return;
    }
    setError('');
    try {
      await updateItem(item.id, {
        name,
        price,
        unit: itemDraft.unit,
        category_id: itemDraft.category_id === '' ? null : Number(itemDraft.category_id),
      });
      setEditingItemId(null);
      await reload();
    } catch (e) {
      setError(getErrorMessage(e, 'Unable to update item.'));
    }
  };

  const handleDeleteItem = async (item: Item) => {
    if (!window.confirm(`Delete item "${item.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await deleteItem(item.id);
      await reload();
    } catch (e) {
      setError(getErrorMessage(e, 'Unable to delete item.'));
    }
  };

  // Optimistic availability toggle.
  const toggleAvailability = async (item: Item) => {
    const next = !item.is_available;
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, is_available: next } : i)));
    try {
      await setItemAvailability(item.id, next);
    } catch (e) {
      // Revert on failure.
      setItems((current) => current.map((i) => (i.id === item.id ? { ...i, is_available: !next } : i)));
      setError(getErrorMessage(e, 'Unable to update availability.'));
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <OwnerNav />

        <header className="mb-6 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Menu</p>
          <h1 className="mt-2 text-3xl font-bold">Manage Menu</h1>
          <p className="mt-2 text-slate-300">Organise your categories and items.</p>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="rounded-3xl bg-white/10 p-8 text-center text-slate-200">Loading menu...</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            {/* Category management */}
            <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <h2 className="text-xl font-bold">Categories</h2>
              <p className="mt-1 text-sm text-slate-500">Reorder with the arrows; deleting keeps items.</p>

              <div className="mt-4 flex gap-2">
                <input
                  className={inputClass}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory();
                  }}
                  placeholder="New category name"
                  value={newCategoryName}
                />
                <button
                  className="shrink-0 rounded-xl bg-slate-950 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
                  onClick={handleAddCategory}
                  type="button"
                >
                  Add
                </button>
              </div>

              <ul className="mt-4 space-y-2">
                {sortedCategories.length === 0 ? (
                  <li className="rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-500">
                    No categories yet.
                  </li>
                ) : null}
                {sortedCategories.map((category, index) => (
                  <li
                    className="flex items-center gap-2 rounded-xl border border-slate-200 p-2"
                    key={category.id}
                  >
                    <div className="flex flex-col">
                      <button
                        aria-label="Move up"
                        className="px-1 text-xs text-slate-400 hover:text-slate-900 disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => moveCategory(index, -1)}
                        type="button"
                      >
                        ▲
                      </button>
                      <button
                        aria-label="Move down"
                        className="px-1 text-xs text-slate-400 hover:text-slate-900 disabled:opacity-30"
                        disabled={index === sortedCategories.length - 1}
                        onClick={() => moveCategory(index, 1)}
                        type="button"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="select-none text-slate-300" title="Reorder">⠿</span>

                    {editingCategoryId === category.id ? (
                      <input
                        autoFocus
                        className={inputClass}
                        onBlur={() => saveCategoryName(category)}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveCategoryName(category);
                          if (e.key === 'Escape') setEditingCategoryId(null);
                        }}
                        value={editingCategoryName}
                      />
                    ) : (
                      <span className="flex-1 font-semibold">{category.name}</span>
                    )}

                    <button
                      className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                      onClick={() => beginEditCategory(category)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-lg px-2 py-1 text-sm font-semibold text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteCategory(category)}
                      type="button"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Item management */}
            <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold">Items</h2>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
                    onChange={(e) => setFilterCategory(e.target.value)}
                    value={filterCategory}
                  >
                    <option value="all">All categories</option>
                    <option value="none">Uncategorized</option>
                    {sortedCategories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="shrink-0 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    onClick={() => {
                      setShowAddItem((s) => !s);
                      setNewItem(emptyItemDraft);
                    }}
                    type="button"
                  >
                    {showAddItem ? 'Cancel' : 'Add Item'}
                  </button>
                </div>
              </div>

              {showAddItem ? (
                <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-sm font-medium">Name</span>
                    <input
                      className={inputClass}
                      onChange={(e) => setNewItem((d) => ({ ...d, name: e.target.value }))}
                      placeholder="e.g. Mango Juice"
                      value={newItem.name}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Price (₹)</span>
                    <input
                      className={inputClass}
                      min="0"
                      onChange={(e) => setNewItem((d) => ({ ...d, price: e.target.value }))}
                      step="0.01"
                      type="number"
                      value={newItem.price}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Unit</span>
                    <select
                      className={inputClass}
                      onChange={(e) => setNewItem((d) => ({ ...d, unit: e.target.value }))}
                      value={newItem.unit}
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Category</span>
                    <select
                      className={inputClass}
                      onChange={(e) => setNewItem((d) => ({ ...d, category_id: e.target.value }))}
                      value={newItem.category_id}
                    >
                      <option value="">Uncategorized</option>
                      {sortedCategories.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-end">
                    <button
                      className="w-full rounded-xl bg-amber-300 px-4 py-2 font-bold text-slate-950 transition hover:bg-amber-200"
                      onClick={handleAddItem}
                      type="button"
                    >
                      Save Item
                    </button>
                  </div>
                </div>
              ) : null}

              <ul className="mt-4 space-y-2">
                {filteredItems.length === 0 ? (
                  <li className="rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-500">
                    No items{filterCategory === 'all' ? '' : ' in this filter'}.
                  </li>
                ) : null}

                {filteredItems.map((item) =>
                  editingItemId === item.id ? (
                    <li className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:grid-cols-2" key={item.id}>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-medium">Name</span>
                        <input
                          className={inputClass}
                          onChange={(e) => setItemDraft((d) => ({ ...d, name: e.target.value }))}
                          value={itemDraft.name}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium">Price (₹)</span>
                        <input
                          className={inputClass}
                          min="0"
                          onChange={(e) => setItemDraft((d) => ({ ...d, price: e.target.value }))}
                          step="0.01"
                          type="number"
                          value={itemDraft.price}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium">Unit</span>
                        <select
                          className={inputClass}
                          onChange={(e) => setItemDraft((d) => ({ ...d, unit: e.target.value }))}
                          value={itemDraft.unit}
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                          {/* Preserve a legacy unit not in the standard list. */}
                          {UNIT_OPTIONS.includes(itemDraft.unit as (typeof UNIT_OPTIONS)[number]) ? null : (
                            <option value={itemDraft.unit}>{itemDraft.unit}</option>
                          )}
                        </select>
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-medium">Category</span>
                        <select
                          className={inputClass}
                          onChange={(e) => setItemDraft((d) => ({ ...d, category_id: e.target.value }))}
                          value={itemDraft.category_id}
                        >
                          <option value="">Uncategorized</option>
                          {sortedCategories.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex gap-2 sm:col-span-2">
                        <button
                          className="flex-1 rounded-xl bg-slate-950 px-4 py-2 font-bold text-white transition hover:bg-slate-800"
                          onClick={() => saveItem(item)}
                          type="button"
                        >
                          Save
                        </button>
                        <button
                          className="flex-1 rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700 transition hover:bg-white"
                          onClick={() => setEditingItemId(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </li>
                  ) : (
                    <li
                      className={`flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 ${
                        item.is_available ? '' : 'opacity-60'
                      }`}
                      key={item.id}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-slate-500">
                          ₹{formatPrice(item.price) ?? '0'} · {item.unit} ·{' '}
                          {item.category_name || 'Uncategorized'}
                        </p>
                      </div>

                      <button
                        aria-pressed={item.is_available}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                          item.is_available
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                        onClick={() => toggleAvailability(item)}
                        type="button"
                      >
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </button>
                      <button
                        className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                        onClick={() => beginEditItem(item)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg px-2 py-1 text-sm font-semibold text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteItem(item)}
                        type="button"
                      >
                        Delete
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export default Menu;
