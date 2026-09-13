import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Building2,
  Lock,
  Phone,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  Package,
} from 'lucide-react';

export const LoginPage = () => {
  const { login, loading, error } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!phone || !password) {
      const msg = 'Please enter both phone number and password';
      setLocalError(msg);
      toast.warning(msg, 'Input Required');
      return;
    }
    const success = await login(phone, password);
    if (!success) {
      const msg = 'Invalid phone number or password. Please check your credentials.';
      setLocalError(msg);
      toast.error(msg, 'Login Failed');
    } else {
      toast.success('Welcome to Salase Admin Portal!', 'Logged In');
    }
  };

  const handleQuickLogin = (quickPhone, quickPass) => {
    setPhone(quickPhone);
    setPassword(quickPass);
    login(quickPhone, quickPass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-sky-500 selection:text-white">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 via-sky-500 to-cyan-400 mx-auto flex items-center justify-center shadow-xl shadow-sky-950/80 border border-sky-400/30 mb-4">
          <Building2 className="w-9 h-9 text-white" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          SALASE PLUMBING & BATHWARE
        </h2>
        <p className="mt-1.5 text-xs text-sky-400 font-semibold tracking-wider uppercase">
          Wholesale B2B ERP & Field Sales Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 py-8 px-6 sm:px-10 rounded-3xl shadow-2xl shadow-black/80 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white">Sign In to Admin Portal</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your authorized phone number and password.
            </p>
          </div>

          {(localError || error) && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>{localError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Phone Number (Login ID):
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 9898011111"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-sky-500 font-mono tracking-wider"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <span className="animate-pulse">Authenticating...</span>
              ) : (
                <>
                  <span>Sign In & Open CRM</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials for Testing */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">
              Quick 1-Click Demo Login
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('9898011111', 'admin123')}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-white font-bold text-xs group-hover:text-sky-400">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>Boss / Uncle</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">9898011111</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('9898022222', 'warehouse123')}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-white font-bold text-xs group-hover:text-indigo-400">
                  <Package className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Warehouse</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">9898022222</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Encrypted Wholesale Session • Morbi / Gujarat Hub</span>
        </div>
      </div>
    </div>
  );
};
