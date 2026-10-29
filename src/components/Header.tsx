import React from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import { LANStatusBadge } from './LANStatusBadge';
import { PWAInstallButton } from './PWAInstallButton';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, pageTitle }) => {
  const { user } = useAuth();
  const { settings } = useSettings();

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left side: Hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">{pageTitle}</h2>
          <div className="text-[11px] text-slate-500 hidden sm:block">{todayStr}</div>
        </div>
      </div>

      {/* Right side: LAN status badge, PWA button, Cashier badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        <LANStatusBadge />
        <PWAInstallButton />
        {user && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs text-slate-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="capitalize">{user.role}</span>
          </div>
        )}
      </div>
    </header>
  );
};
