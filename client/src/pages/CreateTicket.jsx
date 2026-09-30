import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  Send, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Paperclip, 
  Layers, 
  Building2, 
  ArrowRight 
} from 'lucide-react';
import { ticketService, categoryService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ESTIMATED_SLA_HOURS = {
  Low: '48 Hours (Resolution Target)',
  Medium: '24 Hours (Resolution Target)',
  High: '8 Hours (Resolution Target)',
  Critical: '4 Hours (Urgent Resolution Target)',
};

const CreateTicket = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    subcategory: '',
    priority: 'Medium',
    department: user?.department || 'IT Operations',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [createdTicket, setCreatedTicket] = useState(null);

  // Fetch real categories from backend on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await categoryService.getCategories();
        if (res.data.success) {
          setCategories(res.data.data);
          if (res.data.data.length > 0) {
            setFormData((prev) => ({
              ...prev,
              category: res.data.data[0]._id,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load categories', err);
        setApiError('Unable to load categories. Please try refreshing the page.');
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Current selected category object
  const selectedCategoryObj = categories.find((c) => c._id === formData.category);
  const availableSubcategories = selectedCategoryObj?.subcategories?.filter((s) => s.active) || [];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Reset subcategory if category changes
      ...(name === 'category' ? { subcategory: '' } : {}),
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.description.trim()) newErrors.description = 'Detailed description is required';
    if (!formData.category) newErrors.category = 'Please select a category';
    if (!formData.priority) newErrors.priority = 'Priority is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const res = await ticketService.createTicket(formData);
      if (res.data.success && res.data.data?.ticket) {
        setCreatedTicket(res.data.data.ticket);
      }
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-brand-400" />
            Create IT Support Ticket
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Submit a new technical incident, request, or service inquiry to the IT team.
          </p>
        </div>
      </div>

      {/* Success Confirmation Card */}
      {createdTicket && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl backdrop-blur-xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                  Ticket Submitted
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Ticket <span className="text-brand-300 font-mono">{createdTicket.ticketNumber}</span> Created Successfully
                </h3>
                <p className="text-slate-300 text-sm mt-1">
                  Subject: <strong className="text-white">{createdTicket.subject}</strong> • SLA Due:{' '}
                  <span className="text-emerald-300 font-medium">
                    {new Date(createdTicket.slaDueAt).toLocaleString()}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate(`/tickets/${createdTicket._id}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-600/20"
              >
                View Ticket <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatedTicket(null);
                  setFormData({
                    subject: '',
                    description: '',
                    category: categories[0]?._id || '',
                    subcategory: '',
                    priority: 'Medium',
                    department: user?.department || 'General',
                  });
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition-all"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Ticket Form */}
      {!createdTicket && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {apiError && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Ticket Subject <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="e.g. Unable to connect to VPN after password change"
              className={`w-full px-4 py-3 bg-slate-850 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all ${
                errors.subject ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-750'
              }`}
            />
            {errors.subject && <p className="mt-1.5 text-xs text-rose-400">{errors.subject}</p>}
          </div>

          {/* Category & Subcategory Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Category <span className="text-rose-400">*</span>
              </label>
              {loadingCategories ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-400" /> Loading categories...
                </div>
              ) : (
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-850 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                >
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Subcategory
              </label>
              <select
                name="subcategory"
                value={formData.subcategory}
                onChange={handleInputChange}
                disabled={availableSubcategories.length === 0}
                className="w-full px-4 py-3 bg-slate-850 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 transition-all"
              >
                <option value="">-- Select Subcategory (Optional) --</option>
                {availableSubcategories.map((sub) => (
                  <option key={sub.name} value={sub.name}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority & Department Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Priority Level <span className="text-rose-400">*</span>
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-850 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              >
                <option value="Low">Low — Minor inconvenience</option>
                <option value="Medium">Medium — Standard technical issue</option>
                <option value="High">High — Critical business workflow impacted</option>
                <option value="Critical">Critical — Severe system/production outage</option>
              </select>

              {/* SLA Estimate Box */}
              <div className="mt-2.5 flex items-center gap-2 p-2.5 rounded-xl bg-slate-850/80 border border-slate-800 text-xs text-slate-300">
                <Clock className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                <span>
                  SLA Target: <strong className="text-brand-300">{ESTIMATED_SLA_HOURS[formData.priority]}</strong>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Department
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="e.g. Engineering, Sales, Human Resources"
                  className="w-full pl-10 pr-4 py-3 bg-slate-850 border border-slate-750 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Detailed Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              name="description"
              rows={5}
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Please provide steps to reproduce, error messages, and any relevant details..."
              className={`w-full px-4 py-3 bg-slate-850 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all ${
                errors.description ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-750'
              }`}
            />
            {errors.description && <p className="mt-1.5 text-xs text-rose-400">{errors.description}</p>}
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/my-tickets')}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Ticket...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Support Ticket
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateTicket;
