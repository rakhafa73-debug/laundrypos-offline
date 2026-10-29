import React, { useState } from 'react';
import { Download, CheckCircle, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200/60">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>PWA Aktif</span>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95"
        title="Pasang aplikasi di terminal kasir ini untuk akses instan tanpa internet"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install Aplikasi POS</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Pasang di iPad/iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Pasang di iPad / iPhone</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                1. Buka halaman ini di browser <strong>Safari</strong>.<br />
                2. Sentuh tombol <strong>Bagikan / Share</strong> (ikon kotak panah atas).<br />
                3. Gulir ke bawah dan sentuh <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-emerald-700 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
