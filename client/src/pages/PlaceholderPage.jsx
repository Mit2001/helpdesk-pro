import React from 'react';
import { useLocation } from 'react-router-dom';
import { Layers, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PlaceholderPage = ({ title, description, allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
        <div className="h-12 w-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{title || 'Module'}</h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto mb-6">
          {description || `Route ${location.pathname} successfully resolved and role verified.`}
        </p>

        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-850 border border-slate-800 text-xs text-slate-300">
          <span>Active Role: <strong className="text-white">{user?.role}</strong></span>
          <span>•</span>
          <span>Route: <code className="text-brand-400">{location.pathname}</code></span>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
