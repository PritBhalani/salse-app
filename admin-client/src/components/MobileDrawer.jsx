import React from 'react';
import {
  X,
  LayoutDashboard,
  PhoneCall,
  PackageCheck,
  Boxes,
  MapPin,
  Building2,
  Users,
  Smartphone,
  LogOut,
  Radio,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const MobileDrawer = ({ isOpen, onClose, activeTab, onTabChange }) => {
  const { user, loginAs, logout } = useAuth();
  const { isConnected } = useSocket();

  if (!isOpen) return null;

  const navItems = [
    {
      id: 'dashboard',
      label: 'CRM Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'calling-sheet',
      label: 'Pre-Visit Call Sheet',
      icon: PhoneCall,
      badge: 'Priority',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'dispatch',
      label: 'Warehouse Dispatch Queue',
      icon: PackageCheck,
      badge: 'Live',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'inventory',
      label: 'Catalog & Stock Manager',
      icon: Boxes,
      badge: null,
    },
    {
      id: 'routes',
      label: 'Multi-City Beat Planner',
      icon: MapPin,
      badge: null,
    },
    {
      id: 'shops',
      label: 'Shops & Dual Ledgers',
      icon: Building2,
      badge: null,
    },
    {
      id: 'tracking',
      label: 'Salesmen & Staff IDs',
      icon: Users,
      badge: 'Security',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'salesman-ledger',
      label: 'Salesman Portfolios & Bills',
      icon: BookOpen,
      badge: 'Ledgers',
      badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    },
    {
      id: 'simulator',
      label: '📱 Mobile App Simulator',
      icon: Smartphone,
      badge: 'Interactive',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
  ];

  const handleSelectTab = (tabId) => {
    onTabChange(tabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 border-r border-slate-800 z-10 shadow-2xl overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-md border border-slate-700 shrink-0">
              <img src="/logo.png" alt="Shivam Marketing" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white tracking-tight truncate">
                SHIVAM MARKETING
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  B2B CRM
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Radio className={`w-2.5 h-2.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Switcher Section */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Switch Operating Mode
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => loginAs('ADMIN')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                user?.role === 'ADMIN'
                  ? 'bg-sky-600 border-sky-500 text-white shadow-md shadow-sky-950/50'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>👑 Boss</span>
            </button>
            <button
              onClick={() => loginAs('WAREHOUSE')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                user?.role === 'WAREHOUSE'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-950/50'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📦 Warehouse</span>
            </button>
          </div>
        </div>

        {/* Navigation Items (All 8 Modules) */}
        <div className="flex-1 p-3 space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            All 8 CRM Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                      isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 mt-auto">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-xs text-sky-400 shrink-0">
                {user?.name?.slice(0, 2).toUpperCase() || 'SA'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user?.name}</div>
                <div className="text-[10px] text-slate-400 capitalize">{user?.role} Mode</div>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {user?.role}
            </span>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Log out from Shivam Marketing CRM?')) {
                logout();
              }
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
