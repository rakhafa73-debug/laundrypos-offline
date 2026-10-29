import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LANProvider } from './context/LANContext';
import { SettingsProvider } from './context/SettingsContext';

// Components
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import type { Order } from './types';
import { apiFetch } from './utils/api';

// Pages
import { InitialSetupPage } from './pages/InitialSetupPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { OrdersPage } from './pages/OrdersPage';
import { CustomersPage } from './pages/CustomersPage';
import { ServicesPage } from './pages/ServicesPage';
import { FinancePage } from './pages/FinancePage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { BackupPage } from './pages/BackupPage';
import { SettingsPage } from './pages/SettingsPage';

function AppContent() {
  const { user, isLoading, needsSetup } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Global Receipt Preview Modal
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);
  const [showGlobalReceipt, setShowGlobalReceipt] = useState<boolean>(false);

  // Register PWA service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
      });
    }
  }, []);

  // Default tab based on role when user logs in
  useEffect(() => {
    if (user) {
      if (user.role === 'operator') {
        setCurrentTab('orders');
      } else if (user.role === 'cashier') {
        setCurrentTab('pos');
      } else {
        setCurrentTab('dashboard');
      }
    }
  }, [user]);

  const handleOpenReceiptById = async (orderId: string) => {
    try {
      const res = await apiFetch(`/api/v1/orders/${orderId}`);
      if (res.success && res.order) {
        setActiveReceiptOrder(res.order);
        setShowGlobalReceipt(true);
      }
    } catch (err) {
      console.error('Failed to open receipt:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-bold text-slate-700">Memulai LaundryPOS Offline...</div>
        </div>
      </div>
    );
  }

  // 1. If first-time setup needed (no admin yet in SQLite database)
  if (needsSetup) {
    return <InitialSetupPage />;
  }

  // 2. If not logged in
  if (!user) {
    return <LoginPage />;
  }

  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard Operasional',
    pos: 'Kasir Transaksi Laundry Kiloan',
    orders: 'Manajemen Pesanan & Antrean',
    customers: 'Data Pelanggan & Piutang',
    services: 'Layanan & Tarif Laundry',
    finance: 'Sesi Kasir & Pengeluaran Toko',
    reports: 'Laporan Keuangan & Omzet',
    users: 'Pengguna & Otorisasi Staf',
    audit: 'Audit Log & Keamanan',
    backup: 'Cadangan & Pemulihan Database',
    settings: 'Pengaturan Toko & Printer',
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex text-slate-900">
      
      {/* Role-aware Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        
        {/* Sticky Top Header */}
        <Header
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          pageTitle={pageTitles[currentTab] || 'LaundryPOS'}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 pb-10">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigate={setCurrentTab}
              onOpenReceipt={handleOpenReceiptById}
            />
          )}

          {currentTab === 'pos' && (
            <POSPage />
          )}

          {currentTab === 'orders' && (
            <OrdersPage />
          )}

          {currentTab === 'customers' && (
            <CustomersPage />
          )}

          {currentTab === 'services' && (
            <ServicesPage />
          )}

          {currentTab === 'finance' && (
            <FinancePage />
          )}

          {currentTab === 'reports' && (
            <ReportsPage />
          )}

          {currentTab === 'users' && (
            <UsersPage />
          )}

          {currentTab === 'audit' && (
            <AuditLogPage />
          )}

          {currentTab === 'backup' && (
            <BackupPage />
          )}

          {currentTab === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* Global Thermal Receipt Modal */}
      <ThermalReceiptModal
        order={activeReceiptOrder}
        isOpen={showGlobalReceipt}
        onClose={() => {
          setShowGlobalReceipt(false);
          setActiveReceiptOrder(null);
        }}
        isReprint={true}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LANProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </LANProvider>
    </AuthProvider>
  );
}
