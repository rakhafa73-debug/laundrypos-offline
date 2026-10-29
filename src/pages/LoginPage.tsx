import React, { useState } from 'react';
import { Shirt, Lock, User as UserIcon, LogIn, Sparkles, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { LANStatusBadge } from '../components/LANStatusBadge';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Masukkan username dan password.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (res.success && res.token && res.user) {
        login(res.token, res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col justify-center items-center p-4">
      {/* Top LAN connection badge */}
      <div className="absolute top-4 right-4">
        <LANStatusBadge />
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-800 flex items-center justify-center text-white mb-3 shadow-lg shadow-emerald-950/20">
            <Shirt className="w-8 h-8 text-emerald-100" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">LaundryPOS Offline</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sistem Kasir & Operasional Toko Jaringan Lokal (LAN)
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Username
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username akun"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700 focus:outline-hidden transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700 focus:outline-hidden transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 text-xs mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Memeriksa Kredensial...' : 'Masuk ke Sistem POS'}</span>
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pilih Akun Masuk Cepat:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillQuickAccount('admin', 'admin123')}
              className="p-2 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 rounded-xl text-left transition border border-slate-200"
            >
              <div className="text-[11px] font-bold text-slate-900">👑 Admin</div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">admin / admin123</div>
            </button>
            <button
              type="button"
              onClick={() => fillQuickAccount('kasir1', 'kasir123')}
              className="p-2 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 rounded-xl text-left transition border border-slate-200"
            >
              <div className="text-[11px] font-bold text-slate-900">🛒 Kasir</div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">kasir1 / kasir123</div>
            </button>
            <button
              type="button"
              onClick={() => fillQuickAccount('operator1', 'operator123')}
              className="p-2 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 rounded-xl text-left transition border border-slate-200"
            >
              <div className="text-[11px] font-bold text-slate-900">🧺 Operator</div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">operator1 / operator123</div>
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-slate-400">
          Operasional 100% mandiri pada jaringan LAN toko tanpa ketergantungan cloud.
        </div>
      </div>
    </div>
  );
};
