import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center backdrop-blur-xl">
        <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-semibold mb-3">
          HTTP 403 • Forbidden
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          You are currently signed in as <span className="text-slate-200 font-semibold">{user?.name || 'User'}</span> with role{' '}
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-brand-300 border border-slate-700 font-mono text-xs">
            {user?.role || 'Guest'}
          </span>
          . Your account does not have authorization to view this resource.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-all shadow-lg shadow-brand-600/20"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to My Dashboard
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-all border border-slate-700"
          >
            <LogOut className="w-4 h-4" />
            Switch Account / Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
