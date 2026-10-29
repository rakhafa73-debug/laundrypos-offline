import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Shirt,
  Users,
  Tag,
  Wallet,
  BarChart3,
  UserCog,
  ShieldAlert,
  Database,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  if (!user) return null;

  const role = user.role;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'cashier'] },
    { id: 'pos', label: 'Kasir (POS)', icon: ShoppingCart, roles: ['admin', 'cashier'], highlight: true },
    { id: 'orders', label: 'Pesanan & Antrean', icon: Shirt, roles: ['admin', 'cashier', 'operator'] },
    { id: 'customers', label: 'Pelanggan', icon: Users, roles: ['admin', 'cashier'] },
    { id: 'services', label: 'Layanan & Tarif', icon: Tag, roles: ['admin'] },
    { id: 'finance', label: 'Sesi Kasir & Biaya', icon: Wallet, roles: ['admin', 'cashier'] },
    { id: 'reports', label: 'Laporan Keuangan', icon: BarChart3, roles: ['admin'] },
    { id: 'users', label: 'Pengguna & Role', icon: UserCog, roles: ['admin'] },
    { id: 'audit', label: 'Audit Log', icon: ShieldAlert, roles: ['admin'] },
    { id: 'backup', label: 'Backup & Restore', icon: Database, roles: ['admin'] },
    { id: 'settings', label: 'Pengaturan Toko', icon: Settings, roles: ['admin'] },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  const roleBadgeText = {
    admin: 'Administrator',
    cashier: 'Kasir Toko',
    operator: 'Operator Cuci',
  }[role];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container: Charcoal & Deep Emerald theme */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0a1b14] text-slate-200 flex flex-col border-r border-emerald-950/60 shadow-xl transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-emerald-900/40 bg-[#06150f]">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/50">
            <Shirt className="w-5 h-5 text-emerald-100" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white tracking-tight truncate">
              {settings.store_name || 'LaundryPOS'}
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
              <span>Sistem Kasir LAN</span>
              <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
              <span>Offline</span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 mx-3 my-2 rounded-xl bg-emerald-950/40 border border-emerald-800/30">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{user.fullName}</div>
              <div className="text-[10px] text-emerald-300 font-medium">{roleBadgeText}</div>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60 font-bold'
                    : item.highlight
                    ? 'bg-emerald-900/30 text-emerald-200 hover:bg-emerald-900/50 hover:text-white'
                    : 'text-slate-300 hover:bg-emerald-950/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
              </button>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-emerald-900/40 bg-[#06150f]">
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
