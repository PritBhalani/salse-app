import React from 'react';
import {
  LayoutDashboard,
  PhoneCall,
  PackageCheck,
  Boxes,
  MapPin,
  Building2,
  ShieldCheck,
  FileSpreadsheet,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ activeTab, onTabChange, onOpenMiracleModal }) => {
  const { user } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'CRM Dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'WAREHOUSE'],
    },
    {
      id: 'calling-sheet',
      label: 'Pre-Visit Call Sheet (2-3 Days)',
      icon: PhoneCall,
      roles: ['ADMIN', 'WAREHOUSE'],
      badge: 'Priority',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'dispatch',
      label: 'Warehouse Dispatch Queue',
      icon: PackageCheck,
      roles: ['ADMIN', 'WAREHOUSE'],
      badge: 'Live',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'inventory',
      label: 'Catalog & Stock Manager',
      icon: Boxes,
      roles: ['ADMIN', 'WAREHOUSE'],
    },
    {
      id: 'routes',
      label: 'Multi-City Beat Planner',
      icon: MapPin,
      roles: ['ADMIN', 'WAREHOUSE'],
    },
    {
      id: 'shops',
      label: 'Shops & Dual Ledgers',
      icon: Building2,
      roles: ['ADMIN', 'WAREHOUSE'],
    },
    {
      id: 'tracking',
      label: 'GPS Audit & Cash Drawer',
      icon: ShieldCheck,
      roles: ['ADMIN', 'WAREHOUSE'],
    },
    {
      id: 'simulator',
      label: '📱 Mobile App Simulator',
      icon: Smartphone,
      roles: ['ADMIN', 'WAREHOUSE'],
      badge: 'Interactive',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 shrink-0 hidden md:flex flex-col justify-between p-4">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Management Modules
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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

      {/* Miracle Accounting Quick Launcher Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-800/70 to-slate-800/40 border border-slate-700/60 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Miracle Sync Ready</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          1-Click export to Miracle Accounting for automatic GST & rough ledger sync.
        </p>
        <button
          onClick={onOpenMiracleModal}
          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow transition-all"
        >
          Open Miracle Exporter
        </button>
      </div>
    </aside>
  );
};
