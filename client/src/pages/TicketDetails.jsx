import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  FolderTree, 
  Calendar, 
  MessageSquare, 
  Lock, 
  ShieldAlert, 
  Paperclip, 
  Loader2, 
  AlertCircle, 
  Send, 
  Sparkles, 
  RefreshCw, 
  AlertOctagon, 
  Archive, 
  RotateCcw, 
  X, 
  User, 
  FileText, 
  History 
} from 'lucide-react';
import { ticketService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PriorityBadge from '../components/common/PriorityBadge';
import TicketStatusBadge from '../components/common/TicketStatusBadge';
import SlaStatusBadge from '../components/common/SlaStatusBadge';

const ALLOWED_STATUSES = [
  'Open',
  'Assigned',
  'In Progress',
  'Pending Customer',
  'Escalated',
  'Resolved',
  'Closed',
];

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Conversation Composer State
  const [composerTab, setComposerTab] = useState('public'); // 'public' | 'internal'
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Workflow Action Modals
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('');

  const [showCloseModal, setShowCloseModal] = useState(false);

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Quick Sidebar selectors
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState('');

  // Active view tab: 'conversation' vs 'audit_timeline'
  const [activeTab, setActiveTab] = useState('conversation');

  const isSupportOrAdmin = user?.role === 'Support Engineer' || user?.role === 'Admin';

  // Fetch ticket details
  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await ticketService.getTicketById(id);
      if (res.data.success) {
        const t = res.data.data;
        setTicket(t);
        setSelectedStatus(t.status);
        setSelectedPriority(t.priority);
        setSelectedEngineer(t.assignedTo?._id || '');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Ticket not found or unauthorized');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isSupportOrAdmin) {
      const fetchEngineers = async () => {
        try {
          const res = await userService.getAssignableUsers();
          if (res.data.success) {
            setEngineers(res.data.data || []);
          }
        } catch (err) {
          console.error('Failed to load assignable engineer list', err);
        }
      };
      fetchEngineers();
    }
  }, [isSupportOrAdmin]);

  useEffect(() => {
    if (id === 'new' || id === 'create') {
      navigate('/tickets/new', { replace: true });
      return;
    }
    fetchTicket();
  }, [id, fetchTicket, navigate]);

  // Send Message / Add Comment or Internal Note
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      setSendingMessage(true);
      setError('');

      if (composerTab === 'internal' && isSupportOrAdmin) {
        // Send Private Internal Note
        const res = await ticketService.addInternalNote(ticket._id, {
          message: messageText.trim(),
        });
        if (res.data.success) {
          setMessageText('');
          setActionSuccess('Internal note recorded securely');
          setTimeout(() => setActionSuccess(''), 3000);
          fetchTicket();
        }
      } else {
        // Send Public Customer Reply
        const res = await ticketService.addComment(ticket._id, {
          message: messageText.trim(),
        });
        if (res.data.success) {
          setMessageText('');
          setActionSuccess('Reply sent to customer');
          setTimeout(() => setActionSuccess(''), 3000);
          fetchTicket();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Escalate Action
  const handleEscalateSubmit = async (e) => {
    e.preventDefault();
    if (!escalateReason.trim()) return;

    try {
      setUpdating(true);
      setError('');
      const res = await ticketService.escalateTicket(ticket._id, {
        reason: escalateReason.trim(),
      });
      if (res.data.success) {
        setTicket(res.data.data);
        setSelectedStatus('Escalated');
        setShowEscalateModal(false);
        setEscalateReason('');
        setActionSuccess('Ticket escalated to senior engineering tier');
        setTimeout(() => setActionSuccess(''), 4000);
        fetchTicket();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to escalate ticket');
    } finally {
      setUpdating(false);
    }
  };

  // Resolve Action
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) return;

    try {
      setUpdating(true);
      setError('');
      const res = await ticketService.resolveTicket(ticket._id, {
        resolution: resolutionSummary.trim(),
      });
      if (res.data.success) {
        setTicket(res.data.data);
        setSelectedStatus('Resolved');
        setShowResolveModal(false);
        setResolutionSummary('');
        setActionSuccess('Ticket resolved and solution recorded');
        setTimeout(() => setActionSuccess(''), 4000);
        fetchTicket();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve ticket');
    } finally {
      setUpdating(false);
    }
  };

  // Close Action
  const handleCloseConfirm = async () => {
    try {
      setUpdating(true);
      setError('');
      const res = await ticketService.closeTicket(ticket._id);
      if (res.data.success) {
        setTicket(res.data.data);
        setSelectedStatus('Closed');
        setShowCloseModal(false);
        setActionSuccess('Ticket has been closed successfully');
        setTimeout(() => setActionSuccess(''), 4000);
        fetchTicket();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to close ticket');
    } finally {
      setUpdating(false);
    }
  };

  // Reopen Action
  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;

    try {
      setUpdating(true);
      setError('');
      const res = await ticketService.reopenTicket(ticket._id, {
        reason: reopenReason.trim(),
      });
      if (res.data.success) {
        setTicket(res.data.data);
        setSelectedStatus('Open');
        setShowReopenModal(false);
        setReopenReason('');
        setActionSuccess('Ticket reopened and placed in active queue');
        setTimeout(() => setActionSuccess(''), 4000);
        fetchTicket();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reopen ticket');
    } finally {
      setUpdating(false);
    }
  };

  // Priority change
  const handlePriorityChange = async (newPriority) => {
    if (newPriority === ticket.priority) return;
    try {
      setUpdating(true);
      setError('');
      const res = await ticketService.updateTicket(ticket._id, { priority: newPriority });
      if (res.data.success) {
        setTicket(res.data.data);
        setSelectedPriority(res.data.data.priority);
        setActionSuccess(`Priority updated to "${newPriority}". SLA recalculated.`);
        setTimeout(() => setActionSuccess(''), 4000);
        fetchTicket();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update priority');
      setSelectedPriority(ticket.priority);
    } finally {
      setUpdating(false);
    }
  };

  // Assignment change
  const handleAssignmentChange = async (engineerId) => {
    try {
      setUpdating(true);
      setError('');
      const payload = { assignedTo: engineerId || null };
      const res = await ticketService.updateTicket(ticket._id, payload);
      if (res.data.success) {
        setTicket(res.data.data);
        setSelectedEngineer(res.data.data.assignedTo?._id || '');
        const engineerName = res.data.data.assignedTo?.name || 'Unassigned';
        setActionSuccess(`Ticket assigned to: ${engineerName}`);
        setTimeout(() => setActionSuccess(''), 4000);
        fetchTicket();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update assignment');
      setSelectedEngineer(ticket.assignedTo?._id || '');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-sm font-medium">Loading ticket details and conversation...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
        <div className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Ticket Unavailable</h2>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const comments = ticket.comments || [];
  const timeline = ticket.timeline || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-750 transition-all"
            title="Back to queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-mono font-bold text-brand-400">
                {ticket.ticketNumber}
              </span>
              <TicketStatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="text-xl font-bold text-white mt-1">{ticket.subject}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTicket}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-750 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-red-950/70 border border-red-800 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Column Layout: Main Conversation (Left) + Actions & SLA (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Section: Description + Tabs (Conversation / Timeline) + Composer */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Problem Description Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Problem Description
            </h3>
            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line bg-slate-850/60 p-4 rounded-2xl border border-slate-800">
              {ticket.description}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-[10px] font-bold">
                  {ticket.createdBy?.name?.charAt(0) || 'U'}
                </div>
                <span>Submitted by <strong className="text-slate-200">{ticket.createdBy?.name}</strong></span>
              </div>
              <span>•</span>
              <div>Department: <strong className="text-slate-200">{ticket.department}</strong></div>
              <span>•</span>
              <div>Created: <strong className="text-slate-200">{new Date(ticket.createdAt).toLocaleString()}</strong></div>
            </div>
          </div>

          {/* Resolution Details Card */}
          {(ticket.status === 'Resolved' || ticket.status === 'Closed' || ticket.resolution) && (
            <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-3xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" /> Resolution Summary
                </div>
                {ticket.resolvedAt && (
                  <span className="text-[11px] text-emerald-400/80">
                    Resolved at {new Date(ticket.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <p className="text-sm text-emerald-100/90 whitespace-pre-line leading-relaxed">
                {ticket.resolution || 'Issue was investigated and resolution confirmed.'}
              </p>
            </div>
          )}

          {/* Conversation & Activity Tabs Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-850/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('conversation')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'conversation'
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Conversation ({comments.length})
                </button>

                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'timeline'
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Audit Events ({timeline.length})
                </button>
              </div>
            </div>

            {/* Conversation Feed */}
            {activeTab === 'conversation' && (
              <div className="p-6 space-y-4">
                {comments.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No replies yet. Use the composer below to respond.
                  </div>
                ) : (
                  comments.map((msg) => {
                    const isInternal = msg.visibility === 'Internal';
                    return (
                      <div
                        key={msg._id || msg.createdAt}
                        className={`p-4 rounded-2xl border transition-all ${
                          isInternal
                            ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                            : 'bg-slate-850 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                isInternal
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-brand-500/20 text-brand-400'
                              }`}
                            >
                              {msg.author?.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  {msg.author?.name || 'Support Staff'}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                                  {msg.author?.role || 'Staff'}
                                </span>
                                {isInternal && (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-900/60 text-amber-300 border border-amber-700 font-semibold">
                                    <Lock className="w-2.5 h-2.5" /> Internal Note (Staff Only)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className="text-[11px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <p className="text-sm leading-relaxed whitespace-pre-line pl-9">
                          {msg.message}
                        </p>
                      </div>
                    );
                  })
                )}

                {/* Message Composer */}
                <div className="mt-6 pt-6 border-t border-slate-800">
                  {/* Tabs for Support / Admin */}
                  {isSupportOrAdmin && (
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setComposerTab('public')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          composerTab === 'public'
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Public Reply (Visible to Customer)
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerTab('internal')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          composerTab === 'internal'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-amber-300'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" /> 🔒 Internal Note (Staff Only)
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <textarea
                      rows={3}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={
                        composerTab === 'internal'
                          ? 'Add private internal technical note for engineers and admin...'
                          : 'Write your reply...'
                      }
                      className={`w-full px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 text-white placeholder-slate-500 transition-all ${
                        composerTab === 'internal'
                          ? 'bg-amber-950/20 border border-amber-800/60 focus:ring-amber-500'
                          : 'bg-slate-850 border border-slate-750 focus:ring-brand-500'
                      }`}
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {composerTab === 'internal'
                          ? '🔒 Notes are hidden from the employee and logged in audit trail.'
                          : '💬 Public replies are emailed and visible to the ticket creator.'}
                      </span>

                      <button
                        type="submit"
                        disabled={sendingMessage || !messageText.trim()}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          composerTab === 'internal'
                            ? 'bg-amber-600 hover:bg-amber-500'
                            : 'bg-brand-600 hover:bg-brand-500'
                        }`}
                      >
                        {sendingMessage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            {composerTab === 'internal' ? 'Post Internal Note' : 'Send Public Reply'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Audit Timeline Feed */}
            {activeTab === 'timeline' && (
              <div className="p-6 space-y-3">
                {timeline.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No audit records logged for this ticket yet.
                  </div>
                ) : (
                  timeline.map((event) => (
                    <div
                      key={event._id || event.createdAt}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-850/60 border border-slate-800 text-xs text-slate-300"
                    >
                      <div className="h-2 w-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold text-white">{event.description}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          By {event.user?.name || 'System'} • {new Date(event.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Actions & SLA */}
        <div className="space-y-6">
          
          {/* Quick Actions Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" /> Ticket Actions
            </h3>

            <div className="space-y-2.5">
              {/* Escalate Button */}
              {isSupportOrAdmin && ticket.status !== 'Closed' && ticket.status !== 'Resolved' && ticket.status !== 'Escalated' && (
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 border border-purple-800 text-xs font-semibold transition-all"
                >
                  <AlertOctagon className="w-4 h-4 text-purple-400" /> Escalate Ticket
                </button>
              )}

              {/* Resolve Button */}
              {isSupportOrAdmin && ticket.status !== 'Closed' && ticket.status !== 'Resolved' && (
                <button
                  type="button"
                  onClick={() => setShowResolveModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800 text-xs font-semibold transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Resolve Ticket
                </button>
              )}

              {/* Close Button */}
              {isSupportOrAdmin && ticket.status === 'Resolved' && (
                <button
                  type="button"
                  onClick={() => setShowCloseModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold transition-all"
                >
                  <Archive className="w-4 h-4 text-slate-400" /> Close Ticket
                </button>
              )}

              {/* Reopen Button */}
              {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
                <button
                  type="button"
                  onClick={() => setShowReopenModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-900/40 hover:bg-amber-900/60 text-amber-200 border border-amber-800 text-xs font-semibold transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" /> Reopen Ticket
                </button>
              )}
            </div>
          </div>

          {/* SLA Tracking Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-400" />
                SLA Compliance
              </span>
              <SlaStatusBadge slaStatus={ticket.slaStatus} slaDueAt={ticket.slaDueAt} />
            </div>

            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
              <div className="text-xs text-slate-400">Resolution Due Target:</div>
              <div className="text-sm font-bold text-white">
                {ticket.slaDueAt ? new Date(ticket.slaDueAt).toLocaleString() : 'N/A'}
              </div>
              <div className="text-[11px] text-slate-400">
                Created: {new Date(ticket.createdAt).toLocaleDateString()} at{' '}
                {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              {ticket.firstResponseAt && (
                <div className="text-[11px] text-emerald-400 pt-1 border-t border-slate-800">
                  First response: {new Date(ticket.firstResponseAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>

          {/* Management Controls (Support Engineer / Admin) */}
          {isSupportOrAdmin && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-brand-400" /> Management Settings
              </h3>

              {/* Priority Updater */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Priority (Recalculates SLA)
                </label>
                <select
                  disabled={updating}
                  value={selectedPriority}
                  onChange={(e) => {
                    setSelectedPriority(e.target.value);
                    handlePriorityChange(e.target.value);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 transition-all"
                >
                  <option value="Low">Low (48h SLA)</option>
                  <option value="Medium">Medium (24h SLA)</option>
                  <option value="High">High (8h SLA)</option>
                  <option value="Critical">Critical (4h SLA)</option>
                </select>
              </div>

              {/* Assign Engineer */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Assigned Engineer
                </label>
                <select
                  disabled={updating}
                  value={selectedEngineer}
                  onChange={(e) => {
                    setSelectedEngineer(e.target.value);
                    handleAssignmentChange(e.target.value);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 transition-all"
                >
                  <option value="">-- Unassigned --</option>
                  {engineers.map((eng) => (
                    <option key={eng._id} value={eng._id}>
                      {eng.name} ({eng.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Ticket Metadata */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3.5 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-slate-400 mb-2">
              Ticket Information
            </h3>

            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Category</span>
              <span className="font-semibold text-white">{ticket.category?.name || 'General'}</span>
            </div>

            {ticket.subcategory && (
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Subcategory</span>
                <span className="font-semibold text-slate-200">{ticket.subcategory}</span>
              </div>
            )}

            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Department</span>
              <span className="font-semibold text-white">{ticket.department}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Last Activity</span>
              <span className="text-slate-300">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
            </div>

            {ticket.reopenedAt && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs">
                <strong>Reopened:</strong> {new Date(ticket.reopenedAt).toLocaleString()}
                {ticket.reopenReason && <p className="mt-1 text-slate-300">"{ticket.reopenReason}"</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ESCALATE MODAL */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-purple-400" /> Escalate Ticket
              </h3>
              <button
                onClick={() => setShowEscalateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Escalating ticket <strong className="text-white">{ticket.ticketNumber}</strong> will update its priority queue status and alert senior engineering leads.
            </p>

            <form onSubmit={handleEscalateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Escalation Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="e.g. Infrastructure outage requires Level 3 DevOps intervention..."
                  className="w-full px-4 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !escalateReason.trim()}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {updating ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE MODAL */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Resolve Ticket
              </h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Please summarize the root cause and resolution provided to resolve ticket{' '}
              <strong className="text-white">{ticket.ticketNumber}</strong>.
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Resolution Summary <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="e.g. Reconfigured user gateway routing table and verified stable VPN connection..."
                  className="w-full px-4 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !resolutionSummary.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {updating ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE MODAL */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Archive className="w-5 h-5 text-slate-400" /> Close Ticket
              </h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently close ticket <strong className="text-white">{ticket.ticketNumber}</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseConfirm}
                disabled={updating}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow-md disabled:opacity-50"
              >
                {updating ? 'Closing...' : 'Close Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN MODAL */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" /> Reopen Ticket
              </h3>
              <button
                onClick={() => setShowReopenModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Reopening ticket <strong className="text-white">{ticket.ticketNumber}</strong> will restore its active status in the support queue and reset SLA target timing.
            </p>

            <form onSubmit={handleReopenSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason for Reopening <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. The VPN disconnects intermittently again after system reboot..."
                  className="w-full px-4 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !reopenReason.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {updating ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetails;
