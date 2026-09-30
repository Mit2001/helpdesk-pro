import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Edit2,
  Power,
  Loader2,
  AlertCircle,
  X,
  Zap,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { slaService } from '../../services/api';
import PriorityBadge from '../../components/common/PriorityBadge';

export const SlaManagement = () => {
  const [slas, setSlas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editSla, setEditSla] = useState(null);
  const [statusChangeSla, setStatusChangeSla] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  const [formData, setFormData] = useState({
    priority: 'Medium',
    responseTimeHours: 6,
    resolutionTimeHours: 24,
    description: '',
    status: 'Active',
  });

  const fetchSLAs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await slaService.getSLAs();
      if (res.data?.success) {
        setSlas(res.data.data || []);
      }
    } catch (err) {
      console.error('[SlaManagement Error]', err);
      setError(err.response?.data?.message || 'Failed to load SLA policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSLAs();
  }, []);

  const handleCreateSLA = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setModalError(null);

    try {
      const res = await slaService.createSLA({
        priority: formData.priority,
        responseTimeHours: Number(formData.responseTimeHours),
        resolutionTimeHours: Number(formData.resolutionTimeHours),
        description: formData.description,
        status: formData.status,
      });

      if (res.data?.success) {
        setSuccessMsg(`SLA policy for "${res.data.data.priority}" created successfully!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setCreateModalOpen(false);
        setFormData({
          priority: 'Medium',
          responseTimeHours: 6,
          resolutionTimeHours: 24,
          description: '',
          status: 'Active',
        });
        fetchSLAs();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to create SLA policy.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSLA = async (e) => {
    e.preventDefault();
    if (!editSla) return;
    setActionLoading(true);
    setModalError(null);

    try {
      const res = await slaService.updateSLA(editSla._id, {
        responseTimeHours: Number(editSla.responseTimeHours),
        resolutionTimeHours: Number(editSla.resolutionTimeHours),
        description: editSla.description,
      });

      if (res.data?.success) {
        setSuccessMsg(`SLA policy for "${editSla.priority}" updated successfully!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setEditSla(null);
        fetchSLAs();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update SLA policy.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!statusChangeSla) return;
    setActionLoading(true);
    setModalError(null);

    const newStatus = statusChangeSla.status === 'Active' ? 'Inactive' : 'Active';

    try {
      const res = await slaService.updateSLAStatus(statusChangeSla._id, {
        status: newStatus,
      });

      if (res.data?.success) {
        setSuccessMsg(
          `SLA policy for "${statusChangeSla.priority}" successfully ${
            newStatus === 'Active' ? 'activated' : 'deactivated'
          }!`
        );
        setTimeout(() => setSuccessMsg(''), 4000);
        setStatusChangeSla(null);
        fetchSLAs();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update SLA status.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              SLA Policy Configuration
            </h1>
            <p className="text-xs text-slate-400">
              Define service level agreements, first response targets, and resolution deadlines by priority
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => fetchSLAs()}
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
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New SLA Policy</span>
          </button>
        </div>
      </div>

      {/* Info notice about historical accuracy */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-start space-x-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-white">Enterprise SLA Compliance Rule:</strong> When SLA policies are modified, new target response and resolution hours will automatically apply to all newly created tickets. Existing historical ticket SLA timestamps remain permanently preserved for audit and compliance accuracy.
        </p>
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

      {/* SLA Policies Grid / Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="text-xs">Loading SLA policies...</span>
          </div>
        ) : slas.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <Clock className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No SLA policies configured</p>
            <p className="text-xs text-slate-500 mt-1">
              Click refresh or create a new SLA policy.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase bg-slate-850/80 text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Priority Level</th>
                  <th className="px-4 py-3">Response Target</th>
                  <th className="px-4 py-3">Resolution Target</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {slas.map((policy) => {
                  const isActive = policy.status === 'Active';

                  return (
                    <tr
                      key={policy._id}
                      className="transition-colors hover:bg-slate-800/40 group"
                    >
                      {/* Priority */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <PriorityBadge priority={policy.priority} />
                      </td>

                      {/* Response Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 text-slate-200 font-semibold">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Within {policy.responseTimeHours} {policy.responseTimeHours === 1 ? 'hour' : 'hours'}</span>
                        </div>
                      </td>

                      {/* Resolution Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 text-slate-200 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Within {policy.resolutionTimeHours} {policy.resolutionTimeHours === 1 ? 'hour' : 'hours'}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3.5 text-slate-400 max-w-[280px] truncate">
                        {policy.description || 'Standard SLA policy'}
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
                            setEditSla({ ...policy });
                          }}
                          className="inline-flex items-center px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition text-[11px] font-medium"
                          title="Edit SLA Target Hours"
                        >
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </button>

                        <button
                          onClick={() => {
                            setModalError(null);
                            setStatusChangeSla({ ...policy });
                          }}
                          className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium transition ${
                            isActive
                              ? 'bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400'
                              : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400'
                          }`}
                          title={isActive ? 'Deactivate SLA Policy' : 'Activate SLA Policy'}
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
      </div>

      {/* CREATE SLA MODAL */}
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
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create SLA Policy</h3>
                <p className="text-xs text-slate-400">Configure response & resolution thresholds</p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSLA} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Priority Level *</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    First Response (Hours) *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    required
                    value={formData.responseTimeHours}
                    onChange={(e) =>
                      setFormData({ ...formData, responseTimeHours: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Resolution Target (Hours) *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    required
                    value={formData.resolutionTimeHours}
                    onChange={(e) =>
                      setFormData({ ...formData, resolutionTimeHours: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Policy Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the scope of this SLA tier..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 resize-none"
                />
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
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Policy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SLA MODAL */}
      {editSla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setEditSla(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Edit SLA Policy</h3>
                <p className="text-xs text-slate-400">Priority: {editSla.priority}</p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSLA} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    First Response (Hours) *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    required
                    value={editSla.responseTimeHours}
                    onChange={(e) =>
                      setEditSla({ ...editSla, responseTimeHours: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Resolution Target (Hours) *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    required
                    value={editSla.resolutionTimeHours}
                    onChange={(e) =>
                      setEditSla({ ...editSla, resolutionTimeHours: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Policy Description</label>
                <textarea
                  rows={3}
                  value={editSla.description || ''}
                  onChange={(e) => setEditSla({ ...editSla, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditSla(null)}
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
                  <span>Save SLA Target</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS TOGGLE MODAL */}
      {statusChangeSla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
            <button
              onClick={() => setStatusChangeSla(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div
                className={`p-2 rounded-xl border ${
                  statusChangeSla.status === 'Active'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {statusChangeSla.status === 'Active'
                    ? 'Deactivate SLA Policy'
                    : 'Activate SLA Policy'}
                </h3>
                <p className="text-xs text-slate-400">Priority: {statusChangeSla.priority}</p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {statusChangeSla.status === 'Active'
                ? `Deactivating the ${statusChangeSla.priority} SLA policy will cause newly created ${statusChangeSla.priority} tickets to fallback to system default hours until re-activated.`
                : `Activating the ${statusChangeSla.priority} SLA policy will immediately apply this policy's targets to all incoming ${statusChangeSla.priority} tickets.`}
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setStatusChangeSla(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleStatusToggle}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  statusChangeSla.status === 'Active'
                    ? 'bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {statusChangeSla.status === 'Active'
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

export default SlaManagement;
