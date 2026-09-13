import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Menu,
  Radio,
  LogOut,
} from 'lucide-react';

export const Navbar = ({ onOpenMobileMenu }) => {
  const { user, loginAs, logout } = useAuth();
  const { isConnected } = useSocket();

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand & Logo & Mobile Drawer Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {/* Mobile Hamburger Drawer Trigger */}
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg shadow-sky-950/40 border border-slate-700 overflow-hidden shrink-0">
            <img src="/logo.png" alt="Shivam Marketing Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-bold text-sm sm:text-base lg:text-lg text-white tracking-tight truncate">
                SHIVAM MARKETING
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                B2B CRM & ERP
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-400 truncate">
              Bath Accessories & Wholesale Portal
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
          {/* Live Real-time Status */}
          <div
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium border ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
            title={isConnected ? 'Live Socket connected to Warehouse' : 'Socket disconnected'}
          >
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse' : ''}`} />
            <span className="hidden xs:inline">{isConnected ? 'LIVE SYNC' : 'OFFLINE'}</span>
          </div>

          {/* Quick Role Switcher (Admin vs Warehouse - Desktop/Tablet) */}
          <div className="hidden sm:flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => loginAs('ADMIN')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                user?.role === 'ADMIN'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👑 Boss
            </button>
            <button
              onClick={() => loginAs('WAREHOUSE')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                user?.role === 'WAREHOUSE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📦 Warehouse
            </button>
          </div>

          {/* Active User Badge & Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3 pl-1.5 sm:pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-xs text-sky-400 shrink-0">
              {user?.name?.slice(0, 2).toUpperCase() || 'SA'}
            </div>
            <div className="hidden md:block text-left text-xs">
              <div className="text-slate-200 font-semibold truncate max-w-[140px]">{user?.name}</div>
              <div className="text-slate-400 capitalize">{user?.role} Mode</div>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Log out from Shivam Marketing CRM?')) {
                  logout();
                }
              }}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
