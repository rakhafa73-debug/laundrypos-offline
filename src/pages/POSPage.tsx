import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  UserPlus,
  Scale,
  Sparkles,
  Printer,
  CheckCircle,
  Plus,
  Search,
  AlertTriangle,
  Receipt,
  User
} from 'lucide-react';
import type { Customer, ServiceItem, Order } from '../types';
import { apiFetch, formatRupiah, formatKg } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ThermalReceiptModal } from '../components/ThermalReceiptModal';

interface POSPageProps {
  onOrderCreated?: (order: Order) => void;
}

export const POSPage: React.FC<POSPageProps> = () => {
  const { user } = useAuth();

  // Data lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active cashier session
  const [activeSession, setActiveSession] = useState<any>(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [weightGrams, setWeightGrams] = useState<number>(3000); // default 3000g = 3kg
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [additionalFee, setAdditionalFee] = useState<number>(0);
  const [fragrance, setFragrance] = useState<string>('Ocean Fresh');
  const [notes, setNotes] = useState<string>('');
  
  // Payment State
  const [paymentOption, setPaymentOption] = useState<'full' | 'dp' | 'later'>('full');
  const [customDPAmount, setCustomDPAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'qris'>('cash');
  const [cashTendered, setCashTendered] = useState<number>(0);

  // Quick Customer Creation Modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Receipt Modal State for instant print
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [custRes, srvRes, sessRes] = await Promise.all([
        apiFetch('/api/v1/customers?limit=100'),
        apiFetch('/api/v1/services'),
        apiFetch('/api/v1/cash-sessions/active')
      ]);

      if (custRes.success) setCustomers(custRes.customers || []);
      if (srvRes.success) {
        setServices(srvRes.services || []);
        if (srvRes.services.length > 0 && !selectedServiceId) {
          setSelectedServiceId(srvRes.services[0].id);
        }
      }
      if (sessRes.success) setActiveSession(sessRes.session);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data POS.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Real-time calculations
  const pricePerKg = selectedService?.price_per_unit || 0;
  const minGrams = selectedService?.min_units || 1000;
  const billableGrams = Math.max(weightGrams, minGrams);
  const subtotal = Math.round((billableGrams / 1000) * pricePerKg);
  const totalAmount = Math.max(0, subtotal - (discountAmount || 0) + (additionalFee || 0));

  let downPayment = 0;
  if (paymentOption === 'full') {
    downPayment = totalAmount;
  } else if (paymentOption === 'dp') {
    downPayment = Math.min(customDPAmount, totalAmount);
  } else {
    downPayment = 0;
  }

  const remainingBalance = totalAmount - downPayment;
  const changeDue = paymentMethod === 'cash' && cashTendered > downPayment ? cashTendered - downPayment : 0;

  // Quick weight adjustment helpers
  const addGrams = (g: number) => {
    setWeightGrams((prev) => Math.max(0, prev + g));
  };
  const setExactKg = (kg: number) => {
    setWeightGrams(kg * 1000);
  };

  // Quick Create Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    try {
      const res = await apiFetch('/api/v1/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: newCustName,
          phone: newCustPhone,
          address: newCustAddress
        })
      });

      if (res.success && res.customer) {
        setCustomers((prev) => [res.customer, ...prev]);
        setSelectedCustomerId(res.customer.id);
        setShowNewCustomerModal(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustAddress('');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan pelanggan.');
    }
  };

  // Submit Order Atomically
  const handleCreateOrder = async () => {
    if (!selectedCustomerId) {
      setError('Pilih pelanggan terlebih dahulu.');
      return;
    }
    if (!selectedServiceId) {
      setError('Pilih layanan laundry.');
      return;
    }
    if (weightGrams <= 0) {
      setError('Berat cucian harus lebih besar dari 0.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const idempotencyKey = 'pos_tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      const payload = {
        customerId: selectedCustomerId,
        serviceId: selectedServiceId,
        weightGrams,
        discountAmount,
        additionalFee,
        fragrance,
        notes,
        downPaymentAmount: downPayment,
        downPaymentMethod: downPayment > 0 ? paymentMethod : undefined,
        idempotencyKey,
        sessionId: activeSession?.id
      };

      const res = await apiFetch('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        // Fetch full order for printing receipt
        const fullOrderRes = await apiFetch(`/api/v1/orders/${res.orderId}`);
        if (fullOrderRes.success && fullOrderRes.order) {
          setReceiptOrder(fullOrderRes.order);
          setShowReceiptModal(true);
        }

        // Reset form for next customer
        setSelectedCustomerId('');
        setCustomerSearch('');
        setWeightGrams(3000);
        setDiscountAmount(0);
        setAdditionalFee(0);
        setNotes('');
        setPaymentOption('full');
        setCashTendered(0);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pesanan ke database server.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Shift Alert if no cash drawer open */}
      {!activeSession && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs font-semibold text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Sesi kasir belum dibuka. Anda dapat tetap melayani transaksi atau membuka sesi kasir di menu Keuangan.</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-rose-900">Tutup</button>
        </div>
      )}

      {/* POS Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (7 cols): Customer, Service, Weight Input */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card 1: Customer Selection */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-700" />
                <span>1. Pilih Pelanggan</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                <span>+ Pelanggan Baru</span>
              </button>
            </div>

            {/* Customer Search & Picker */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cari nama atau nomor telepon..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700 focus:outline-hidden transition"
                />
              </div>

              {/* Quick Customer Badges or Selected Box */}
              {selectedCustomer ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-950">{selectedCustomer.name}</div>
                    <div className="text-[11px] text-emerald-700">{selectedCustomer.phone} {selectedCustomer.address ? `· ${selectedCustomer.address}` : ''}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId('')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                  >
                    Ganti
                  </button>
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {filteredCustomers.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerSearch('');
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between border border-transparent hover:border-slate-200 transition text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{c.name}</div>
                        <div className="text-[10px] text-slate-500">{c.phone}</div>
                      </div>
                      {c.total_debt && c.total_debt > 0 ? (
                        <span className="text-[10px] text-rose-600 font-bold">
                          Piutang: {formatRupiah(c.total_debt)}
                        </span>
                      ) : null}
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Tidak ada pelanggan cocok. Klik tombol + Pelanggan Baru di atas.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Service Selection */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-700" />
              <span>2. Pilih Layanan Kiloan</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {services.map((srv) => {
                const isSelected = selectedServiceId === srv.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setSelectedServiceId(srv.id)}
                    className={`text-left p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{srv.name}</span>
                      <span className="text-xs font-black text-emerald-800">
                        {formatRupiah(srv.price_per_unit)}/kg
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                      {srv.description || `Selesai estimasi ~${srv.estimated_duration_hours} jam`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Weight Input in Grams + Display in Kg */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-700" />
                <span>3. Timbangan Berat Pakaian (Gram & Kg)</span>
              </h3>
              {weightGrams < minGrams && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold">
                  Min. hitung: {formatKg(minGrams)}
                </span>
              )}
            </div>

            {/* Display Box */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex-1 text-center sm:text-left">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tampilan Kilogram
                </div>
                <div className="text-3xl font-black text-emerald-950 font-mono">
                  {formatKg(weightGrams)}
                </div>
              </div>

              {/* Direct Gram Input */}
              <div className="w-full sm:w-48">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Input Angka Gram
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="50"
                    min="100"
                    value={weightGrams || ''}
                    onChange={(e) => setWeightGrams(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-hidden focus:border-emerald-700"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">g</span>
                </div>
              </div>
            </div>

            {/* Quick Increment Buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() => setExactKg(2)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 rounded-xl text-xs font-bold text-slate-700 transition"
              >
                2.00 kg
              </button>
              <button
                type="button"
                onClick={() => setExactKg(3)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 rounded-xl text-xs font-bold text-slate-700 transition"
              >
                3.00 kg
              </button>
              <button
                type="button"
                onClick={() => setExactKg(5)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 rounded-xl text-xs font-bold text-slate-700 transition"
              >
                5.00 kg
              </button>
              <button
                type="button"
                onClick={() => addGrams(500)}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> 500g
              </button>
              <button
                type="button"
                onClick={() => addGrams(1000)}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> 1 kg
              </button>
            </div>
          </div>

          {/* Card 4: Aromatherapy & Garment Condition Notes */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>Pilihan Aroma Pewangi Laundry</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {['Ocean Fresh', 'Lavender Classic', 'Sakura Blossom', 'Baby Sweet', 'Snappy Red'].map((aroma) => (
                  <button
                    key={aroma}
                    type="button"
                    onClick={() => setFragrance(aroma)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      fragrance === aroma
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {aroma}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Kondisi Pakaian / Permintaan Khusus
              </label>
              <input
                type="text"
                placeholder="Misal: Kemeja putih ada noda tinta kerah, pisahkan pakaian gelap, kancing lepas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700 focus:outline-hidden transition"
              />
            </div>
          </div>

        </div>

        {/* Right Column (5 cols): Billing, Payment, and Submit */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-5 sticky top-20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-700" />
              <span>Rincian Tagihan & Pembayaran</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Breakdown List */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Layanan:</span>
              <span className="font-semibold text-slate-900">{selectedService?.name || '-'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tarif / kg:</span>
              <span>{formatRupiah(pricePerKg)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Berat Dihitung:</span>
              <span>{formatKg(billableGrams)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-100">
              <span>Subtotal:</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>

            {/* Discount & Additional Fee Row */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Diskon (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Biaya Tambahan (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={additionalFee || ''}
                  onChange={(e) => setAdditionalFee(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white"
                />
              </div>
            </div>

            {/* Total Highlight */}
            <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/70 flex items-center justify-between mt-3">
              <span className="text-xs font-black text-emerald-950 uppercase">TOTAL AKHIR:</span>
              <span className="text-xl font-black text-emerald-900 font-mono">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment Terms Selector: Lunas vs DP vs Bayar Nanti */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">
              Status Pembayaran Pelanggan:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentOption('full')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition ${
                  paymentOption === 'full'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Bayar Lunas
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentOption('dp');
                  if (customDPAmount === 0) setCustomDPAmount(Math.round(totalAmount / 2));
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition ${
                  paymentOption === 'dp'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Uang Muka (DP)
              </button>
              <button
                type="button"
                onClick={() => setPaymentOption('later')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition ${
                  paymentOption === 'later'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Saat Diambil
              </button>
            </div>

            {/* DP Input if selected */}
            {paymentOption === 'dp' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nominal DP Masuk (Rp)
                </label>
                <input
                  type="number"
                  step="1000"
                  max={totalAmount}
                  value={customDPAmount || ''}
                  onChange={(e) => setCustomDPAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-900"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  Sisa tagihan pelunasan: <strong>{formatRupiah(remainingBalance)}</strong>
                </div>
              </div>
            )}

            {/* Payment Method Selector (if paying now) */}
            {paymentOption !== 'later' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Metode Pembayaran:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'transfer', 'qris'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                        paymentMethod === method
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {/* Cash Tendered & Change calculator */}
                {paymentMethod === 'cash' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">Uang Diterima:</span>
                      <input
                        type="number"
                        step="1000"
                        placeholder={String(downPayment)}
                        value={cashTendered || ''}
                        onChange={(e) => setCashTendered(Number(e.target.value))}
                        className="w-32 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-right font-mono font-bold text-xs"
                      />
                    </div>
                    {cashTendered >= downPayment && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                        <span className="font-bold text-emerald-800">Kembalian:</span>
                        <span className="font-mono font-black text-emerald-900">
                          {formatRupiah(changeDue)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={submitting || !selectedCustomerId || weightGrams <= 0}
              onClick={handleCreateOrder}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-950/20 transition active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{submitting ? 'Menyimpan ke SQLite...' : 'Simpan & Cetak Nota'}</span>
            </button>
            <div className="text-[10px] text-center text-slate-400 mt-2">
              Transaksi disimpan secara atomik pada database server LAN.
            </div>
          </div>

        </div>

      </div>

      {/* Quick Customer Creation Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-700" />
              <span>Tambah Pelanggan Baru</span>
            </h3>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama pelanggan"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nomor Telepon / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="08xxxxxxxxxx"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Alamat (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Alamat rumah / kos"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Preview Modal */}
      <ThermalReceiptModal
        order={receiptOrder}
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setReceiptOrder(null);
        }}
        isReprint={false}
      />

    </div>
  );
};
