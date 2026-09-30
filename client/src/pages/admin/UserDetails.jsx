import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Building,
  Phone,
  Calendar,
  ShieldCheck,
  UserCheck,
  Briefcase,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Edit2,
  Shield,
  Power,
  Ticket,
  Clock,
  AlertTriangle,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { userService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    phone: '',
  });

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userService.getUserById(id);
      if (res.data?.success) {
        setUser(res.data.data);
        setStats(res.data.stats);
        setFormData({
          name: res.data.data.name || '',
          email: res.data.data.email || '',
          department: res.data.data.department || '',
          phone: res.data.data.phone || '',
        });
      }
    } catch (err) {
      console.error('[UserDetails Error]', err);
      setError(err.response?.data?.message || 'Failed to load user details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setModalError(null);

    try {
      const res = await userService.updateUser(id, formData);
      if (res.data?.success) {
        setSuccessMsg('User profile updated successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
        setEditModalOpen(false);
        fetchUserDetails();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update user profile.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (newRole) => {
    setActionLoading(true);
    setModalError(null);

    try {
      const res = await userService.updateUserRole(id, { role: newRole });
      if (res.data?.success) {
        setSuccessMsg(`Role successfully updated to ${newRole}!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setRoleModalOpen(false);
        fetchUserDetails();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to change role.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    setActionLoading(true);
    setModalError(null);

    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';

    try {
      const res = await userService.updateUserStatus(id, { status: newStatus });
      if (res.data?.success) {
        setSuccessMsg(`User account successfully ${newStatus === 'Active' ? 'activated' : 'deactivated'}!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setStatusModalOpen(false);
        fetchUserDetails();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to toggle account status.');
    } finally {
      setActionLoading(false);
    }
  };

  const isSelf = currentUser?._id === user?._id;

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span className="text-xs">Loading user profile...</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-6 rounded-2xl flex items-center space-x-3 text-sm">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="font-semibold">Unable to Load User Profile</h3>
            <p className="text-xs mt-0.5">{error || 'User not found'}</p>
          </div>
        </div>
        <Link
          to="/admin/users"
          className="inline-flex items-center text-xs text-purple-400 hover:text-purple-300 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to User Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/users"
          className="inline-flex items-center text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to User Directory
        </Link>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl flex items-center space-x-3 text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* User Header Profile Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-purple-600/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">{user.name}</h1>
                {isSelf && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                    Your Account
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {user.role === 'Admin' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-900/60 text-purple-300 border border-purple-700">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                  </span>
                )}
                {user.role === 'Support Engineer' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-700">
                    <UserCheck className="w-3 h-3 mr-1" /> Support Engineer
                  </span>
                )}
                {user.role === 'Employee' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                    <Briefcase className="w-3 h-3 mr-1" /> Employee
                  </span>
                )}

                {user.status === 'Active' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                    <XCircle className="w-3 h-3 mr-1" /> Inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setModalError(null);
                setEditModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Edit Details</span>
            </button>

            <button
              onClick={() => {
                setModalError(null);
                setRoleModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Change Role</span>
            </button>

            <button
              onClick={() => {
                setModalError(null);
                setStatusModalOpen(true);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition ${
                user.status === 'Active'
                  ? 'bg-rose-950/40 hover:bg-rose-950 border-rose-800 text-rose-300'
                  : 'bg-emerald-950/40 hover:bg-emerald-950 border-emerald-800 text-emerald-300'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{user.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Details & Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Info */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" />
            <span>Account Details</span>
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Department</span>
              <span className="text-slate-200 font-medium">{user.department || 'General'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Phone</span>
              <span className="text-slate-200 font-medium">{user.phone || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Joined Date</span>
              <span className="text-slate-200 font-medium">
                {new Date(user.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Last Updated</span>
              <span className="text-slate-200 font-medium">
                {new Date(user.updatedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Activity Statistics */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-blue-400" />
            <span>Ticket Activity Metrics</span>
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
              <span className="text-slate-400 text-[11px] block">Requests Created</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {stats?.created?.totalCreated || 0}
              </span>
              <span className="text-[10px] text-slate-500">
                {stats?.created?.openCreated || 0} Open • {stats?.created?.resolvedCreated || 0} Resolved
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
              <span className="text-slate-400 text-[11px] block">Tickets Assigned</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {stats?.assigned?.totalAssigned || 0}
              </span>
              <span className="text-[10px] text-slate-500">
                {stats?.assigned?.openAssigned || 0} Active • {stats?.assigned?.breachedAssigned || 0} Breached
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Edit Profile</h3>
                <p className="text-xs text-slate-400">{user.name}</p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE MODAL */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
            <button
              onClick={() => setRoleModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Change User Role</h3>
                <p className="text-xs text-slate-400">{user.name}</p>
              </div>
            </div>

            {isSelf && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You cannot demote yourself from Administrator to prevent system lockout.</span>
              </div>
            )}

            {modalError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-2">
              {['Employee', 'Support Engineer', 'Admin'].map((r) => (
                <button
                  key={r}
                  disabled={actionLoading || (isSelf && r !== 'Admin')}
                  onClick={() => handleRoleChange(r)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition ${
                    user.role === r
                      ? 'bg-purple-950/60 border-purple-600 text-purple-200'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <span>{r}</span>
                  {user.role === r && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STATUS MODAL */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
            <button
              onClick={() => setStatusModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div
                className={`p-2 rounded-xl border ${
                  user.status === 'Active'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {user.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                </h3>
                <p className="text-xs text-slate-400">{user.name}</p>
              </div>
            </div>

            {isSelf && user.status === 'Active' && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You cannot deactivate your own account to prevent system lockout.</span>
              </div>
            )}

            {modalError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {user.status === 'Active'
                ? 'Deactivating this user will immediately block their login sessions. All historical tickets, comments, and audit records will remain completely intact.'
                : 'Activating this account will restore the user’s ability to sign in and interact with HelpDesk Pro.'}
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setStatusModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading || (isSelf && user.status === 'Active')}
                onClick={handleStatusToggle}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  user.status === 'Active'
                    ? 'bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{user.status === 'Active' ? 'Confirm Deactivation' : 'Confirm Activation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetails;
