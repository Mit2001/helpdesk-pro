import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Briefcase,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Shield,
  Power,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  Eye,
} from 'lucide-react';
import { userService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [roleChangeUser, setRoleChangeUser] = useState(null);
  const [statusChangeUser, setStatusChangeUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Employee',
    department: 'General',
    phone: '',
    status: 'Active',
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userService.getUsers({
        page,
        limit: 10,
        search,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (res.data?.success) {
        setUsers(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('[UserManagement Error]', err);
      setError(err.response?.data?.message || 'Failed to load user list.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleClearFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setModalError(null);

    try {
      const res = await userService.createUser(formData);
      if (res.data?.success) {
        setSuccessMsg(`User ${res.data.data.name} created successfully!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setCreateModalOpen(false);
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'Employee',
          department: 'General',
          phone: '',
          status: 'Active',
        });
        fetchUsers();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setActionLoading(true);
    setModalError(null);

    try {
      const res = await userService.updateUser(editUser._id, {
        name: editUser.name,
        department: editUser.department,
        phone: editUser.phone,
        email: editUser.email,
      });

      if (res.data?.success) {
        setSuccessMsg(`User ${editUser.name} updated successfully!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setEditUser(null);
        fetchUsers();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update user profile.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (newRole) => {
    if (!roleChangeUser) return;
    setActionLoading(true);
    setModalError(null);

    try {
      const res = await userService.updateUserRole(roleChangeUser._id, { role: newRole });
      if (res.data?.success) {
        setSuccessMsg(`User ${roleChangeUser.name}'s role updated to ${newRole}!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setRoleChangeUser(null);
        fetchUsers();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update role.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!statusChangeUser) return;
    setActionLoading(true);
    setModalError(null);

    const newStatus = statusChangeUser.status === 'Active' ? 'Inactive' : 'Active';

    try {
      const res = await userService.updateUserStatus(statusChangeUser._id, { status: newStatus });
      if (res.data?.success) {
        setSuccessMsg(`User account successfully ${newStatus === 'Active' ? 'activated' : 'deactivated'}!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setStatusChangeUser(null);
        fetchUsers();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to change user status.');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Admin':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-900/60 text-purple-300 border border-purple-700">
            <ShieldCheck className="w-3 h-3 mr-1" /> Admin
          </span>
        );
      case 'Support Engineer':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-700">
            <UserCheck className="w-3 h-3 mr-1" /> Support Engineer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700">
            <Briefcase className="w-3 h-3 mr-1" /> Employee
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              User Management
            </h1>
            <p className="text-xs text-slate-400">
              Directory of system accounts, role assignments, and authentication statuses ({pagination.total} total)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => fetchUsers()}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition"
            title="Refresh list"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => {
              setModalError(null);
              setCreateModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl flex items-center space-x-3 text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-center space-x-3 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between backdrop-blur-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, department..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-200 focus:outline-none pr-1 py-1 cursor-pointer font-medium"
            >
              <option value="all" className="bg-slate-900 text-white">All Roles</option>
              <option value="Employee" className="bg-slate-900 text-white">Employee</option>
              <option value="Support Engineer" className="bg-slate-900 text-white">Support Engineer</option>
              <option value="Admin" className="bg-slate-900 text-white">Administrator</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-200 focus:outline-none pr-1 py-1 cursor-pointer font-medium"
            >
              <option value="all" className="bg-slate-900 text-white">All Statuses</option>
              <option value="Active" className="bg-slate-900 text-white">Active Only</option>
              <option value="Inactive" className="bg-slate-900 text-white">Inactive Only</option>
            </select>
          </div>

          {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <span className="text-xs">Loading user accounts...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <Users className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No users found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search criteria or create a new user account.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase bg-slate-850/80 text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => {
                  const isSelf = currentUser?._id === u._id;
                  const isActive = u.status === 'Active';

                  return (
                    <tr
                      key={u._id}
                      className="transition-colors hover:bg-slate-800/40 group"
                    >
                      {/* User identity */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/admin/users/${u._id}`}
                              className="font-semibold text-slate-100 hover:text-purple-400 transition-colors flex items-center gap-1.5"
                            >
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                  You
                                </span>
                              )}
                            </Link>
                            <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            <XCircle className="w-3 h-3 mr-1" /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-300 font-medium">
                        {u.department || 'General'}
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-1.5">
                        {/* View Details */}
                        <Link
                          to={`/admin/users/${u._id}`}
                          className="inline-flex items-center px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px] font-medium"
                          title="View User Profile & Statistics"
                        >
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Link>

                        {/* Edit Profile */}
                        <button
                          onClick={() => {
                            setModalError(null);
                            setEditUser({ ...u });
                          }}
                          className="inline-flex items-center px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition text-[11px] font-medium"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>

                        {/* Change Role (Self demotion guarded) */}
                        <button
                          onClick={() => {
                            setModalError(null);
                            setRoleChangeUser({ ...u });
                          }}
                          className="inline-flex items-center px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-400 hover:text-purple-300 transition text-[11px] font-medium"
                          title="Change Role"
                        >
                          <Shield className="w-3 h-3" />
                        </button>

                        {/* Toggle Status (Self deactivation guarded) */}
                        <button
                          onClick={() => {
                            setModalError(null);
                            setStatusChangeUser({ ...u });
                          }}
                          className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-medium transition ${
                            isActive
                              ? 'bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400'
                              : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400'
                          }`}
                          title={isActive ? 'Deactivate Account' : 'Activate Account'}
                        >
                          <Power className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-850/40 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing Page <span className="font-semibold text-white">{page}</span> of{' '}
              <span className="font-semibold text-white">{pagination.pages}</span> ({pagination.total} users)
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages || loading}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create New User Account</h3>
                <p className="text-xs text-slate-400">Provision a new account with enterprise RBAC</p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="sarah@enterprise.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Initial Password * (min 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Support Engineer">Support Engineer</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="Engineering / IT"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initial Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER PROFILE MODAL */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setEditUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Edit User Profile</h3>
                <p className="text-xs text-slate-400">Update account metadata for {editUser.name}</p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department</label>
                  <input
                    type="text"
                    value={editUser.department || ''}
                    onChange={(e) => setEditUser({ ...editUser, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editUser.phone || ''}
                    onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
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

      {/* CHANGE ROLE MODAL */}
      {roleChangeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
            <button
              onClick={() => setRoleChangeUser(null)}
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
                <p className="text-xs text-slate-400">{roleChangeUser.name}</p>
              </div>
            </div>

            {roleChangeUser._id === currentUser?._id && (
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

            <p className="text-xs text-slate-300 mb-3">Select the new authorization role for this user:</p>

            <div className="space-y-2">
              {['Employee', 'Support Engineer', 'Admin'].map((r) => (
                <button
                  key={r}
                  disabled={actionLoading || (roleChangeUser._id === currentUser?._id && r !== 'Admin')}
                  onClick={() => handleRoleChange(r)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition ${
                    roleChangeUser.role === r
                      ? 'bg-purple-950/60 border-purple-600 text-purple-200'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <span>{r}</span>
                  {roleChangeUser.role === r && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setRoleChangeUser(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS TOGGLE CONFIRMATION DIALOG */}
      {statusChangeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
            <button
              onClick={() => setStatusChangeUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div
                className={`p-2 rounded-xl border ${
                  statusChangeUser.status === 'Active'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {statusChangeUser.status === 'Active' ? 'Deactivate User Account' : 'Activate User Account'}
                </h3>
                <p className="text-xs text-slate-400">{statusChangeUser.name}</p>
              </div>
            </div>

            {statusChangeUser._id === currentUser?._id && statusChangeUser.status === 'Active' && (
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
              {statusChangeUser.status === 'Active'
                ? 'Deactivating this user will immediately block their login sessions. All historical tickets, comments, and audit records will remain completely intact.'
                : 'Activating this account will restore the user’s ability to sign in and interact with HelpDesk Pro.'}
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setStatusChangeUser(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading || (statusChangeUser._id === currentUser?._id && statusChangeUser.status === 'Active')}
                onClick={handleStatusToggle}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  statusChangeUser.status === 'Active'
                    ? 'bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {statusChangeUser.status === 'Active' ? 'Confirm Deactivation' : 'Confirm Activation'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
