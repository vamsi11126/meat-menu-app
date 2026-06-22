import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OwnerNav from '../../components/OwnerNav';
import { useAuth } from '../../context/AuthContext';
import { fetchMyShop, getErrorMessage, updateShopName, type Shop } from '../../api/menu';

const businessTypeLabel = (type: Shop['business_type']) =>
  type === 'static_menu' ? 'Static Menu (e.g. Juice Bar, Restaurant)' : 'Daily Menu (e.g. Meat Shop)';

const ShopSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user?.shop_id) {
        setError('No shop is assigned to this owner account.');
        setIsLoading(false);
        return;
      }
      try {
        const data = await fetchMyShop();
        setShop(data);
        setNameDraft(data.name);
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load shop settings.'));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user?.shop_id]);

  const handleSaveName = async () => {
    const name = nameDraft.trim();
    if (!name) {
      setError('Shop name is required.');
      return;
    }
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      await updateShopName(name);
      setShop((current) => (current ? { ...current, name } : current));
      setIsEditing(false);
      setSuccess('Shop name updated.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update shop name.'));
    } finally {
      setIsSaving(false);
    }
  };

  // The API returns the canonical public menu link for the QR code.
  const qrTarget = shop?.qr_target_url || '';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <OwnerNav />

        <header className="mb-6 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Shop</p>
          <h1 className="mt-2 text-3xl font-bold">Settings</h1>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="rounded-3xl bg-white/10 p-8 text-center text-slate-200">Loading settings...</div>
        ) : shop ? (
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <h2 className="text-xl font-bold">Shop name</h2>
              {isEditing ? (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    autoFocus
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                    maxLength={100}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setIsEditing(false);
                        setNameDraft(shop.name);
                      }
                    }}
                    value={nameDraft}
                  />
                  <div className="flex gap-2">
                    <button
                      className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:opacity-70"
                      disabled={isSaving}
                      onClick={handleSaveName}
                      type="button"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-700 transition hover:bg-white"
                      onClick={() => {
                        setIsEditing(false);
                        setNameDraft(shop.name);
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center justify-between gap-4">
                  <p className="text-2xl font-black">{shop.name}</p>
                  <button
                    className="rounded-2xl border border-slate-300 px-5 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => {
                      setIsEditing(true);
                      setSuccess('');
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                </div>
              )}
              {success ? <p className="mt-3 text-sm font-semibold text-green-600">{success}</p> : null}
            </section>

            <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <h2 className="text-xl font-bold">Business type</h2>
              <p className="mt-2 text-slate-600">{businessTypeLabel(shop.business_type)}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                Set by the administrator and cannot be changed here.
              </p>
            </section>

            <section className="rounded-3xl bg-white p-6 text-center text-slate-950 shadow-2xl">
              <h2 className="text-xl font-bold">Customer menu QR code</h2>
              <div className="mx-auto my-6 w-fit rounded-3xl bg-white p-4 shadow ring-1 ring-slate-200">
                {qrTarget ? (
                  <QRCodeCanvas size={200} value={qrTarget} />
                ) : (
                  <div className="flex h-[200px] w-[200px] items-center justify-center text-slate-400">
                    No QR available
                  </div>
                )}
              </div>
              {qrTarget ? (
                <p className="break-all rounded-2xl bg-slate-100 p-3 text-sm text-slate-600">{qrTarget}</p>
              ) : null}
              <button
                className="mt-5 rounded-2xl bg-amber-300 px-6 py-3 font-bold text-slate-950 transition hover:bg-amber-200"
                onClick={() => navigate('/owner/qr')}
                type="button"
              >
                Open full QR page
              </button>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default ShopSettings;
