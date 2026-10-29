import React, { createContext, useContext, useState, useEffect } from 'react';
import type { StoreSettings } from '../types';
import { apiFetch } from '../utils/api';
import { useAuth } from './AuthContext';

interface SettingsContextType {
  settings: StoreSettings;
  paperWidth: '58' | '80';
  setPaperWidth: (w: '58' | '80') => void;
  refreshSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: 'Berkah Laundry Express',
    store_address: 'Jl. Merdeka No. 45',
    store_phone: '0812-3456-7890',
    thermal_printer_width: '58',
    receipt_prefix: 'LP',
    receipt_footer: 'Terima kasih atas kunjungan Anda!\nPakaian bersih, higienis & rapi.',
    receipt_terms: '1. Pengambilan wajib membawa nota.\n2. Komplain maksimal 1x24 jam.\n3. Pakaian tidak diambil >30 hari di luar tanggungan.',
    require_full_payment_on_pickup: 'true',
    currency_symbol: 'Rp'
  });

  const [paperWidth, setPaperWidthState] = useState<'58' | '80'>(() => {
    return (localStorage.getItem('laundrypos_printer_width') as '58' | '80') || '58';
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const setPaperWidth = (w: '58' | '80') => {
    setPaperWidthState(w);
    localStorage.setItem('laundrypos_printer_width', w);
  };

  const refreshSettings = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const res = await apiFetch('/api/v1/settings');
      if (res.success && res.settings) {
        setSettings(res.settings);
        if (res.settings.thermal_printer_width) {
          setPaperWidthState(res.settings.thermal_printer_width === '80' ? '80' : '58');
        }
      }
    } catch {
      // offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshSettings();
    }
  }, [user]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        paperWidth,
        setPaperWidth,
        refreshSettings,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
