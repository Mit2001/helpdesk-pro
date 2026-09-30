import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  Layers,
} from 'lucide-react';
import { categoryService } from '../../services/api';

export const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [statusChangeCategory, setStatusChangeCategory] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subcategoriesInput: '',
    status: 'Active',
  });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await categoryService.getCategories({
        page,
        limit: 10,
        search,
        status: statusFilter !== 'all' ? statusFilter : 'all',
        sortBy: 'name',
        sortOrder: 'asc',
      });

      if (res.data?.success) {
        setCategories(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('[CategoryManagement Error]', err);
      setError(err.response?.data?.message || 'Failed to load category taxonomy.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setModalError(null);

    const subcategories = formData.subcategoriesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    try {
      const res = await categoryService.createCategory({
        name: formData.name,
        description: formData.description,
        subcategories,
        status: formData.status,
      });

      if (res.data?.success) {
        setSuccessMsg(`Category "${res.data.data.name}" created successfully!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setCreateModalOpen(false);
        setFormData({
          name: '',
          description: '',
          subcategoriesInput: '',
          status: 'Active',
        });
        fetchCategories();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to create category.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editCategory) return;
    setActionLoading(true);
    setModalError(null);

    const subcategories = (editCategory.subcategoriesInput || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    try {
      const res = await categoryService.updateCategory(editCategory._id, {
        name: editCategory.name,
        description: editCategory.description,
        subcategories,
      });

      if (res.data?.success) {
        setSuccessMsg(`Category "${editCategory.name}" updated successfully!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setEditCategory(null);
        fetchCategories();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update category.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!statusChangeCategory) return;
    setActionLoading(true);
    setModalError(null);

    const newStatus = statusChangeCategory.status === 'Active' ? 'Inactive' : 'Active';

    try {
      const res = await categoryService.updateCategoryStatus(statusChangeCategory._id, {
        status: newStatus,
      });

      if (res.data?.success) {
        setSuccessMsg(
          `Category "${statusChangeCategory.name}" successfully ${
            newStatus === 'Active' ? 'activated' : 'deactivated'
          }!`
        );
        setTimeout(() => setSuccessMsg(''), 4000);
        setStatusChangeCategory(null);
        fetchCategories();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update category status.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Category Management
            </h1>
            <p className="text-xs text-slate-400">
              Configure ITSM service categories and subcategory taxonomies ({pagination.total} total)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => fetchCategories()}
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
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
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
            placeholder="Search categories..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
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

          {(search || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs">Loading categories...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <FolderTree className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No categories found</p>
            <p className="text-xs text-slate-500 mt-1">
              Create a new category to define ticket routing options.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase bg-slate-850/80 text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Category Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Subcategories</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {categories.map((cat) => {
                  const isActive = cat.status === 'Active';

                  return (
                    <tr
                      key={cat._id}
                      className="transition-colors hover:bg-slate-800/40 group"
                    >
                      {/* Name */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                            <Layers className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-white">{cat.name}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3.5 text-slate-400 max-w-[280px] truncate">
                        {cat.description || 'No description provided'}
                      </td>

                      {/* Subcategories */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                          {cat.subcategories && cat.subcategories.length > 0 ? (
                            cat.subcategories.slice(0, 3).map((sub, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]"
                              >
                                {sub.name || sub}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">None</span>
                          )}
                          {cat.subcategories?.length > 3 && (
                            <span className="text-[10px] text-slate-400 px-1 py-0.5">
                              +{cat.subcategories.length - 3} more
                            </span>
                          )}
                        </div>
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

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setModalError(null);
                            const subStr = cat.subcategories
                              ? cat.subcategories.map((s) => s.name || s).join(', ')
                              : '';
                            setEditCategory({ ...cat, subcategoriesInput: subStr });
                          }}
                          className="inline-flex items-center px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition text-[11px] font-medium"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </button>

                        <button
                          onClick={() => {
                            setModalError(null);
                            setStatusChangeCategory({ ...cat });
                          }}
                          className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium transition ${
                            isActive
                              ? 'bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400'
                              : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400'
                          }`}
                          title={isActive ? 'Deactivate Category' : 'Activate Category'}
                        >
                          <Power className="w-3 h-3 mr-1" />
                          <span>{isActive ? 'Deactivate' : 'Activate'}</span>
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
              <span className="font-semibold text-white">{pagination.pages}</span> ({pagination.total} categories)
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

      {/* CREATE CATEGORY MODAL */}
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
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create New Category</h3>
                <p className="text-xs text-slate-400">Add an IT service taxonomy category</p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud Infrastructure"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe what kinds of issues fall under this category..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Subcategories (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="AWS, Azure, GCP, VPC, DNS"
                  value={formData.subcategoriesInput}
                  onChange={(e) => setFormData({ ...formData, subcategoriesInput: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {editCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setEditCategory(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Edit Category</h3>
                <p className="text-xs text-slate-400">{editCategory.name}</p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={editCategory.name}
                  onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editCategory.description || ''}
                  onChange={(e) =>
                    setEditCategory({ ...editCategory, description: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Subcategories (comma-separated)
                </label>
                <input
                  type="text"
                  value={editCategory.subcategoriesInput || ''}
                  onChange={(e) =>
                    setEditCategory({ ...editCategory, subcategoriesInput: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditCategory(null)}
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

      {/* STATUS TOGGLE MODAL */}
      {statusChangeCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
            <button
              onClick={() => setStatusChangeCategory(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div
                className={`p-2 rounded-xl border ${
                  statusChangeCategory.status === 'Active'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {statusChangeCategory.status === 'Active'
                    ? 'Deactivate Category'
                    : 'Activate Category'}
                </h3>
                <p className="text-xs text-slate-400">{statusChangeCategory.name}</p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {statusChangeCategory.status === 'Active'
                ? 'Deactivating this category will exclude it from new ticket submission forms. All historical tickets and reports referencing this category will remain completely intact.'
                : 'Activating this category will make it available as a selection option for all new IT support tickets.'}
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setStatusChangeCategory(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleStatusToggle}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  statusChangeCategory.status === 'Active'
                    ? 'bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {statusChangeCategory.status === 'Active'
                    ? 'Confirm Deactivation'
                    : 'Confirm Activation'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
