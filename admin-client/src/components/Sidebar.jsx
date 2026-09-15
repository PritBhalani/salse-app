import React from 'react';
import {
  LayoutDashboard,
  PhoneCall,
  PackageCheck,
  Boxes,
  MapPin,
  Building2,
  Users,
  Smartphone,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ activeTab, onTabChange }) => {
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
      label: 'Pre-Visit Call Sheet',
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
      label: 'Salesmen & Staff IDs',
      icon: Users,
      roles: ['ADMIN', 'WAREHOUSE'],
      badge: 'Security',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'salesman-ledger',
      label: 'Salesman Portfolios & Bills',
      icon: BookOpen,
      roles: ['ADMIN', 'WAREHOUSE'],
      badge: 'Ledgers',
      badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
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

      {/* System Status Summary */}
      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
        <div className="flex items-center gap-2 text-sky-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Wholesale ERP Engine</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Dual-Book GST & Rough Ledger isolation active.
        </p>
      </div>
    </aside>
  );
};
