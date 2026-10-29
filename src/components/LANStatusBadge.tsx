import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useLAN } from '../context/LANContext';

export const LANStatusBadge: React.FC = () => {
  const { status, latencyMs, reconnect } = useLAN();

  if (status === 'connected') {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/70 rounded-lg text-xs font-medium select-none"
        title="Terhubung langsung ke Server Lokal LAN Toko"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
        </span>
        <Wifi className="w-3.5 h-3.5 text-emerald-600" />
        <span className="font-semibold">LAN Terhubung</span>
        {latencyMs !== null && (
          <span className="text-[10px] text-emerald-600/80 font-mono">({latencyMs}ms)</span>
        )}
      </div>
    );
  }

  if (status === 'reconnecting') {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-medium cursor-pointer animate-pulse select-none"
        onClick={reconnect}
        title="Klik untuk mencoba sambungkan ulang"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
        <span>Menghubungkan LAN...</span>
      </div>
    );
  }

  return (
    <button
      onClick={reconnect}
      className="flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold hover:bg-rose-100 transition shadow-xs"
      title="Server LAN terputus. Klik untuk menyambungkan ulang"
    >
      <WifiOff className="w-3.5 h-3.5 text-rose-600" />
      <span>Server Terputus (Klik Reconnect)</span>
    </button>
  );
};
