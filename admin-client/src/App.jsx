import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileDrawer } from './components/MobileDrawer';
import { LoginPage } from './pages/LoginPage';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { CallingSheetPage } from './pages/CallingSheetPage';
import { LiveDispatchPage } from './pages/LiveDispatchPage';
import { InventoryPage } from './pages/InventoryPage';
import { RoutePlannerPage } from './pages/RoutePlannerPage';
import { ShopsLedgerPage } from './pages/ShopsLedgerPage';
import { SalesmanTrackingPage } from './pages/SalesmanTrackingPage';
import { MobileSimulatorPage } from './pages/MobileSimulatorPage';

import {
  Bell,
  X,
  Package,
  PhoneCall,
  LayoutDashboard,
  Boxes,
  Building2,
  Menu,
} from 'lucide-react';

const MainLayout = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { alerts, dismissAlert } = useSocket();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-14 h-14 rounded-2xl bg-white p-1.5 border border-slate-700 flex items-center justify-center shadow-xl shadow-sky-950/60 mb-3 overflow-hidden animate-pulse">
          <img src="/logo.png" alt="Shivam Marketing Logo" className="w-full h-full object-contain" />
        </div>
        <div className="text-sm font-bold text-slate-300">Loading Shivam Marketing CRM...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleNavigateToCallSheet = (routeId) => {
    setActiveTab('calling-sheet');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <Navbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

      {/* Slide-in Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content Area with Senior Responsive Padding */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-slate-950 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardPage onNavigate={setActiveTab} />}
            {activeTab === 'calling-sheet' && <CallingSheetPage />}
            {activeTab === 'dispatch' && <LiveDispatchPage />}
            {activeTab === 'inventory' && <InventoryPage />}
            {activeTab === 'routes' && (
              <RoutePlannerPage onNavigateToCallSheet={handleNavigateToCallSheet} />
            )}
            {activeTab === 'shops' && <ShopsLedgerPage />}
            {activeTab === 'tracking' && <SalesmanTrackingPage />}
            {activeTab === 'simulator' && <MobileSimulatorPage />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (5 Items: CRM, Dispatch, Stock, Ledgers, More) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around py-2 px-1 z-40 shadow-2xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 text-[10px] transition-colors ${
            activeTab === 'dashboard' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>CRM</span>
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 text-[10px] transition-colors ${
            activeTab === 'dispatch' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Dispatch</span>
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 text-[10px] transition-colors ${
            activeTab === 'inventory' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stock</span>
        </button>
        <button
          onClick={() => setActiveTab('shops')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 text-[10px] transition-colors ${
            activeTab === 'shops' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Ledgers</span>
        </button>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex-1 flex flex-col items-center gap-1 py-1 text-[10px] transition-colors ${
            ['calling-sheet', 'routes', 'tracking', 'simulator'].includes(activeTab)
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Menu className="w-4 h-4" />
            {['calling-sheet', 'routes', 'tracking', 'simulator'].includes(activeTab) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sky-400" />
            )}
          </div>
          <span>More</span>
        </button>
      </div>

      {/* Floating Real-Time Toast Notifications */}
      {alerts.length > 0 && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full p-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-slate-900 border-2 border-indigo-500 rounded-2xl p-4 shadow-2xl shadow-indigo-950/60 flex items-start justify-between gap-3 animate-bounce"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">{alert.message}</p>
                  <button
                    onClick={() => {
                      setActiveTab('dispatch');
                      dismissAlert(alert.id);
                    }}
                    className="text-[11px] text-sky-400 hover:underline font-bold mt-1.5 inline-block"
                  >
                    Open Warehouse Pick List &rarr;
                  </button>
                </div>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SocketProvider>
          <MainLayout />
        </SocketProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
