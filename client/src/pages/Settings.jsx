import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Mail, 
  Moon, 
  ShieldCheck, 
  Server, 
  Activity, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { profileService, healthService, getErrorMessage } from '../services/api';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    inAppNotifications: true,
    ticketUpdatesAlert: true,
    theme: 'dark',
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSettings();
    checkApiHealth();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await profileService.getProfile();
      if (res.data.success && res.data.data.preferences) {
        setPreferences({
          emailNotifications: res.data.data.preferences.emailNotifications ?? true,
          inAppNotifications: res.data.data.preferences.inAppNotifications ?? true,
          ticketUpdatesAlert: res.data.data.preferences.ticketUpdatesAlert ?? true,
          theme: res.data.data.preferences.theme || 'dark',
        });
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to load preferences'));
    } finally {
      setLoading(false);
    }
  };

  const checkApiHealth = async () => {
    try {
      setCheckingHealth(true);
      const start = Date.now();
      const res = await healthService.checkHealth();
      const latency = Date.now() - start;
      if (res.data.status === 'ok') {
        setHealthStatus({
          healthy: true,
          latency,
          timestamp: res.data.timestamp,
        });
      } else {
        setHealthStatus({ healthy: false, latency });
      }
    } catch (err) {
      setHealthStatus({ healthy: false, latency: 0 });
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    try {
      setSaving(true);
      const res = await profileService.updateSettings(preferences);
      if (res.data.success) {
        setSuccessMsg('Settings and preferences saved successfully');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-800 rounded-lg"></div>
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl"></div>
        <div className="h-48 bg-slate-900 border border-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your personal preferences, notification alerts, and system connection</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Notification Preferences */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-400" /> Notification Preferences
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Control how and when you receive automated notifications</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-850/60 border border-slate-800 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Email Notifications</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Receive summary emails for major ticket status changes and assignments</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-850/60 border border-slate-800 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">In-App Alerts</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Display real-time notification popovers and badge counts in the header</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.inAppNotifications}
                  onChange={(e) => setPreferences({ ...preferences, inAppNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-850/60 border border-slate-800 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Ticket Activity & SLA Updates</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Receive immediate notifications for escalation, SLA warnings, and replies</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.ticketUpdatesAlert}
                  onChange={(e) => setPreferences({ ...preferences, ticketUpdatesAlert: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Display & Appearance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Moon className="w-4 h-4 text-brand-400" /> Interface Appearance
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Customize the visual theme and styling of the application</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => setPreferences({ ...preferences, theme: 'dark' })}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                preferences.theme === 'dark'
                  ? 'bg-slate-850 border-brand-500 shadow-md shadow-brand-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-brand-400" />
                  <span className="text-xs font-bold text-white">Enterprise Dark (Default)</span>
                </div>
                {preferences.theme === 'dark' && (
                  <span className="w-2 h-2 rounded-full bg-brand-400"></span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Optimized for low eye fatigue in 24/7 IT operations centers.</p>
            </div>

            <div 
              onClick={() => setPreferences({ ...preferences, theme: 'system' })}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                preferences.theme === 'system'
                  ? 'bg-slate-850 border-brand-500 shadow-md shadow-brand-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">System Synchronized</span>
                </div>
                {preferences.theme === 'system' && (
                  <span className="w-2 h-2 rounded-full bg-brand-400"></span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Synchronizes theme dynamically with your operating system preference.</p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-600/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving Preferences...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* System Status & Connectivity Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" /> Platform & API Health
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Live status verification of HelpDesk Pro backend services</p>
          </div>
          <button
            onClick={checkApiHealth}
            disabled={checkingHealth}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
            title="Refresh API status"
          >
            <RefreshCw className={`w-4 h-4 ${checkingHealth ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">API STATUS</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${healthStatus?.healthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              <span className="font-bold text-white">{healthStatus?.healthy ? 'Operational' : 'Unavailable'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">RESPONSE LATENCY</span>
            <span className="font-bold text-emerald-400 mt-1 block">
              {healthStatus ? `${healthStatus.latency} ms` : '—'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">SYSTEM VERSION</span>
            <span className="font-bold text-white mt-1 block">v1.0.0 Enterprise</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
