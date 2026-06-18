import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const QRCode = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const shopId = user?.shop_id;
  const qrUrl = `http://10.244.247.19:5173/menu/${shopId ?? ''}`;

  const downloadQRCode = () => {
    const canvas = document.getElementById('shop-qr-code') as HTMLCanvasElement | null;

    if (!canvas) {
      return;
    }

    const link = document.createElement('a');
    link.download = `shop-${shopId}-qr-code.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-xl">
        <button
          className="mb-6 rounded-2xl border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
          onClick={() => navigate('/owner/dashboard')}
          type="button"
        >
          Back to Dashboard
        </button>

        <section className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Shop QR</p>
          <h1 className="mt-2 text-3xl font-bold">Customer Menu QR Code</h1>
          <p className="mx-auto mt-3 max-w-sm text-slate-300">
            Print this QR code and display it in your shop
          </p>

          <div className="mx-auto my-8 w-fit rounded-3xl bg-white p-5 shadow-xl">
            {shopId ? (
              <QRCodeCanvas id="shop-qr-code" size={260} value={qrUrl} />
            ) : (
              <div className="flex h-[260px] w-[260px] items-center justify-center text-slate-500">
                No shop assigned
              </div>
            )}
          </div>

          <p className="break-all rounded-2xl bg-slate-900 p-4 text-sm text-slate-300">{qrUrl}</p>

          <button
            className="mt-6 w-full rounded-2xl bg-amber-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!shopId}
            onClick={downloadQRCode}
            type="button"
          >
            Download QR Code PNG
          </button>
        </section>
      </div>
    </main>
  );
};

export default QRCode;
