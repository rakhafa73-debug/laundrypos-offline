import React, { useRef } from 'react';
import { X, Printer, Copy, Check, SlidersHorizontal } from 'lucide-react';
import type { Order } from '../types';
import { useSettings } from '../context/SettingsContext';
import { formatRupiah, formatKg, formatDateTime } from '../utils/api';

interface ThermalReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  isReprint?: boolean;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  isReprint = false,
}) => {
  const { settings, paperWidth, setPaperWidth } = useSettings();
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const is58mm = paperWidth === '58';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex flex-col w-full max-w-md max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Header (Hidden during print) */}
        <div className="no-print flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-[#fafaf8]">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-800">
              {isReprint ? 'Cetak Ulang Nota (Salinan)' : 'Cetak Nota Transaksi'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Width Selector Toolbar (Hidden during print) */}
        <div className="no-print flex items-center justify-between px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
          <span className="text-slate-600 font-medium flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            Ukuran Kertas Thermal:
          </span>
          <div className="flex bg-slate-200 p-0.5 rounded-lg">
            <button
              onClick={() => setPaperWidth('58')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                is58mm ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              58 mm
            </button>
            <button
              onClick={() => setPaperWidth('80')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                !is58mm ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80 mm
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="overflow-y-auto p-4 flex justify-center bg-slate-100/70">
          
          {/* Printable Receipt Paper Container */}
          <div
            ref={printContainerRef}
            id="printable-receipt"
            className={`thermal-receipt bg-white text-black p-4 shadow-sm border border-slate-300 font-mono text-[11px] leading-tight select-text ${
              is58mm ? 'w-[58mm] min-w-[58mm] max-w-[58mm]' : 'w-[80mm] min-w-[80mm] max-w-[80mm]'
            }`}
            style={{
              fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace',
            }}
          >
            {/* Reprint Watermark / Banner */}
            {isReprint && (
              <div className="text-center font-bold border-2 border-black py-0.5 mb-2 text-[12px] tracking-widest uppercase">
                *** SALINAN / COPY ***
              </div>
            )}

            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <div className="text-[14px] font-bold tracking-tight uppercase">
                {settings.store_name || 'Berkah Laundry'}
              </div>
              <div className="text-[10px] mt-0.5">{settings.store_address}</div>
              <div className="text-[10px]">Telp/WA: {settings.store_phone}</div>
            </div>

            {/* Transaction Metadata */}
            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-bold">{order.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{formatDateTime(order.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{order.cashier_name || 'Kasir Toko'}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-bold">{order.customer_name || 'Pelanggan'}</span>
              </div>
              {order.customer_phone && (
                <div className="flex justify-between">
                  <span>No. HP:</span>
                  <span>{order.customer_phone}</span>
                </div>
              )}
            </div>

            {/* Service & Item Details */}
            <div className="py-2 border-b border-dashed border-black">
              <div className="font-bold text-[11px] mb-1">
                {order.service_name_snapshot}
              </div>
              <div className="flex justify-between text-[10px]">
                <span>
                  {formatKg(order.weight_grams)} @ {formatRupiah(order.price_per_kg_snapshot)}
                </span>
                <span className="font-bold">{formatRupiah(order.subtotal)}</span>
              </div>
              {order.weight_grams < order.min_units_snapshot && (
                <div className="text-[9px] text-slate-700 italic">
                  *Min. order {formatKg(order.min_units_snapshot)} berlaku
                </div>
              )}
              {order.fragrance && (
                <div className="text-[10px] mt-0.5">
                  Aroma: <span className="font-medium">{order.fragrance}</span>
                </div>
              )}
            </div>

            {/* Calculations & Totals */}
            <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span>Diskon:</span>
                  <span>- {formatRupiah(order.discount_amount)}</span>
                </div>
              )}
              {order.additional_fee > 0 && (
                <div className="flex justify-between">
                  <span>Biaya Tambahan:</span>
                  <span>+ {formatRupiah(order.additional_fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[13px] pt-1 border-t border-dotted border-black">
                <span>TOTAL:</span>
                <span>{formatRupiah(order.total_amount)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Sudah Dibayar:</span>
                <span>{formatRupiah(order.paid_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-[12px] text-black">
                <span>SISA TAGIHAN:</span>
                <span>{formatRupiah(order.remaining_balance)}</span>
              </div>
              <div className="text-center font-bold text-[11px] mt-1 pt-1 border-t border-dotted border-black uppercase">
                {order.remaining_balance === 0 ? 'STATUS: LUNAS' : 'STATUS: BELUM LUNAS (DP)'}
              </div>
            </div>

            {/* Estimation & Garment Condition Notes */}
            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-1">
              <div>
                <span className="font-bold">Estimasi Selesai:</span>
                <div className="font-semibold text-emerald-950">
                  {formatDateTime(order.estimated_completion_at)}
                </div>
              </div>
              {order.notes && (
                <div>
                  <span className="font-bold">Catatan Pakaian / Kondisi:</span>
                  <div className="italic text-[10px]">{order.notes}</div>
                </div>
              )}
            </div>

            {/* Terms and Footer */}
            <div className="pt-2 text-center text-[9px] leading-tight space-y-1.5">
              <div className="whitespace-pre-line text-slate-800">
                {settings.receipt_terms}
              </div>
              <div className="whitespace-pre-line font-bold pt-1 border-t border-dotted border-black">
                {settings.receipt_footer}
              </div>
              <div className="text-[8px] text-slate-600 pt-1">
                Dicetak via LaundryPOS LAN — {new Date().toLocaleDateString('id-ID')}
              </div>
            </div>

          </div>
        </div>

        {/* Modal Actions (Hidden during print) */}
        <div className="no-print p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Kertas: <strong>{paperWidth}mm</strong> thermal
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Nota</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
