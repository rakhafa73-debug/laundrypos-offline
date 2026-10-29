import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Lock,
  Unlock,
  PlusCircle,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import type { CashSession, Expense } from '../types';
import { apiFetch, formatRupiah, formatDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const FinancePage: React.FC = () => {
  const { user } = useAuth();

  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<CashSession[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open Shift Modal
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingCash, setOpeningCash] = useState<number>(100000);
  const [openNotes, setOpenNotes] = useState('');

  // Close Shift Modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualCash, setActualCash] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');

  // Add Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState('deterjen');
  const [expAmount, setExpAmount] = useState<number>(50000);
  const [expDesc, setExpDesc] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [sessRes, histRes, expRes] = await Promise.all([
        apiFetch('/api/v1/cash-sessions/active'),
        apiFetch('/api/v1/cash-sessions/history'),
        apiFetch('/api/v1/expenses?limit=50')
      ]);

      if (sessRes.success) {
        setActiveSession(sessRes.session);
        if (sessRes.session) {
          setActualCash(sessRes.session.expected_cash || sessRes.session.opening_cash);
        }
      }
      if (histRes.success) setSessionHistory(histRes.sessions || []);
      if (expRes.success) setExpenses(expRes.expenses || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data keuangan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch('/api/v1/cash-sessions/open', {
        method: 'POST',
        body: JSON.stringify({
          openingCash,
          notes: openNotes
        })
      });

      if (res.success) {
        setShowOpenModal(false);
        setOpenNotes('');
        fetchFinanceData();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal membuka sesi kasir.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    try {
      setSubmitting(true);
      const res = await apiFetch('/api/v1/cash-sessions/close', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: activeSession.id,
          actualCash,
          notes: closeNotes
        })
      });

      if (res.success) {
        setShowCloseModal(false);
        setCloseNotes('');
        fetchFinanceData();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menutup sesi kasir.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0 || !expDesc) return;

    try {
      setSubmitting(true);
      const res = await apiFetch('/api/v1/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category: expCategory,
          amount: expAmount,
          description: expDesc,
          sessionId: activeSession?.id
        })
      });

      if (res.success) {
        setShowExpenseModal(false);
        setExpDesc('');
        setExpAmount(50000);
        fetchFinanceData();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mencatat pengeluaran.');
    } finally {
      setSubmitting(false);
    }
  };

  const expectedDrawerCash = activeSession?.expected_cash ?? (activeSession?.opening_cash || 0);
  const liveDiff = actualCash - expectedDrawerCash;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Manajemen Kasir & Pengeluaran Toko</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sesi laci kasir (buka/tutup shift), rekonsiliasi kas, dan biaya operasional harian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSession ? (
            <button
              onClick={() => setShowCloseModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
            >
              <Lock className="w-4 h-4" />
              <span>Tutup Sesi Kasir (Hitung Laci)</span>
            </button>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
            >
              <Unlock className="w-4 h-4" />
              <span>Buka Sesi Kasir (Modal Awal)</span>
            </button>
          )}

          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-rose-900">Tutup</button>
        </div>
      )}

      {/* Active Cash Drawer Status Card */}
      {activeSession ? (
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-emerald-800/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-800/40">
            <div>
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Sesi Kasir Sedang Aktif</span>
              </div>
              <div className="text-lg font-black mt-1">
                Kasir: {user?.fullName}
              </div>
              <div className="text-xs text-emerald-200/80 mt-0.5">
                Dibuka sejak: {formatDateTime(activeSession.opened_at)}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-emerald-300 font-semibold">Estimasi Kas Fisik di Laci:</span>
              <div className="text-3xl font-black font-mono text-emerald-300">
                {formatRupiah(activeSession.expected_cash || activeSession.opening_cash)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-emerald-300 font-medium">Modal Awal Kasir:</span>
              <div className="text-base font-bold font-mono mt-1">
                {formatRupiah(activeSession.opening_cash)}
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-emerald-300 font-medium">+ Pembayaran Tunai Masuk:</span>
              <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                + {formatRupiah(activeSession.cash_in || 0)}
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-emerald-300 font-medium">- Pengeluaran Tunai Keluar:</span>
              <div className="text-base font-bold font-mono text-rose-300 mt-1">
                - {formatRupiah(activeSession.cash_out || 0)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200 text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-bold">Laci Kasir Belum Dibuka</div>
              <div className="text-[11px] text-amber-800">
                Silakan buka sesi kasir dengan modal awal agar rekonsiliasi uang fisik tercatat rapi.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowOpenModal(true)}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            Buka Kasir Sekarang
          </button>
        </div>
      )}

      {/* Two Column Section: Expenses List & Shift History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Operational Expenses */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pengeluaran Operasional Toko</h3>
              <p className="text-[11px] text-slate-500">Deterjen, parfum, plastik, listrik/air, transport</p>
            </div>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Catat</span>
            </button>
          </div>

          {expenses.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">Belum ada pengeluaran tercatat.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-bold">
                    <th className="pb-2.5">Waktu</th>
                    <th className="pb-2.5">Kategori</th>
                    <th className="pb-2.5">Keterangan</th>
                    <th className="pb-2.5">Petugas</th>
                    <th className="pb-2.5 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 text-slate-400 font-mono text-[10px]">
                        {formatDateTime(exp.created_at)}
                      </td>
                      <td className="py-2.5">
                        <span className="capitalize font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-2.5 font-medium text-slate-800 max-w-[180px] truncate">
                        {exp.description}
                      </td>
                      <td className="py-2.5 text-slate-500 text-[11px]">
                        {exp.user_name || 'Staf'}
                      </td>
                      <td className="py-2.5 font-bold text-rose-700 text-right font-mono">
                        - {formatRupiah(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Past Cash Sessions */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Riwayat Sesi Kasir</h3>
          <p className="text-[11px] text-slate-500 mb-4">Rekap selisih fisik saat tutup shift</p>

          {sessionHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">Belum ada riwayat sesi kasir.</div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {sessionHistory.map((s) => (
                <div key={s.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{s.cashier_name}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      s.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {s.status === 'open' ? 'SEDANG BUKA' : 'DITUTUP'}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500">
                    Buka: {formatDateTime(s.opened_at)} {s.closed_at ? `· Tutup: ${formatDateTime(s.closed_at)}` : ''}
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[11px]">
                    <span className="text-slate-600">Kas Fisik Aktual:</span>
                    <span className="font-bold font-mono">{formatRupiah(s.actual_cash || s.opening_cash)}</span>
                  </div>

                  {s.status === 'closed' && s.difference !== null && s.difference !== undefined && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600">Selisih Kas:</span>
                      <span className={`font-mono font-black ${
                        s.difference === 0 ? 'text-emerald-700' : s.difference > 0 ? 'text-sky-700' : 'text-rose-700'
                      }`}>
                        {s.difference === 0 ? 'Pas (Rp 0)' : `${s.difference > 0 ? '+' : ''}${formatRupiah(s.difference)}`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal Buka Kasir */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Unlock className="w-4 h-4 text-emerald-700" />
              <span>Buka Sesi Kasir Baru</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">Masukkan uang modal awal pecahan kecil di laci kasir.</p>

            <form onSubmit={handleOpenSession} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Modal Awal Kas (Rp) *
                </label>
                <input
                  type="number"
                  required
                  step="10000"
                  min="0"
                  value={openingCash || ''}
                  onChange={(e) => setOpeningCash(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Catatan Sesi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Shift pagi Siti"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Membuka...' : 'Buka Kasir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tutup Kasir */}
      {showCloseModal && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-700" />
              <span>Tutup Sesi & Hitung Uang Laci</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">Hitung total uang fisik tunai yang ada di laci kasir saat ini.</p>

            <form onSubmit={handleCloseSession} className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Modal Awal:</span>
                  <span>{formatRupiah(activeSession.opening_cash)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Tunai Diharapkan:</span>
                  <span className="font-bold text-slate-900">{formatRupiah(expectedDrawerCash)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Uang Fisik Kasir yang Dihitung (Rp) *
                </label>
                <input
                  type="number"
                  required
                  step="1000"
                  min="0"
                  value={actualCash || ''}
                  onChange={(e) => setActualCash(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 focus:border-emerald-700"
                />
              </div>

              {/* Live difference preview */}
              <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Selisih Kas:</span>
                <span className={`font-mono font-black ${
                  liveDiff === 0 ? 'text-emerald-700' : liveDiff > 0 ? 'text-sky-700' : 'text-rose-700'
                }`}>
                  {liveDiff === 0 ? 'Sesuai (Rp 0)' : `${liveDiff > 0 ? '+ ' : ''}${formatRupiah(liveDiff)}`}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Catatan Penutupan
                </label>
                <input
                  type="text"
                  placeholder="Keterangan jika ada selisih uang"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Menutup Sesi...' : 'Konfirmasi Tutup Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Pengeluaran */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <span>Catat Biaya Operasional</span>
            </h3>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Kategori Pengeluaran *
                </label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                >
                  <option value="deterjen">Deterjen & Pembersih</option>
                  <option value="pewangi">Pewangi & Softener</option>
                  <option value="plastik">Plastik Packing & Hanger</option>
                  <option value="listrik_air">Token Listrik / Air PAM</option>
                  <option value="transport">Bensin / Kurir Antar-Jemput</option>
                  <option value="perawatan">Servis Mesin / Perawatan</option>
                  <option value="lainnya">Pengeluaran Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nominal Pengeluaran (Rp) *
                </label>
                <input
                  type="number"
                  required
                  step="5000"
                  min="1000"
                  value={expAmount || ''}
                  onChange={(e) => setExpAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Keterangan Pembelian *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Beli deterjen matic 5 liter di toko grosir"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Biaya'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
