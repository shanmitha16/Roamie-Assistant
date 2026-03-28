import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Trash2, Search, Star, AlertTriangle, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import { useStore } from '../stores/useStore';

interface FeedbackItem {
  id: string;
  name: string;
  email: string;
  rating: number;
  message: string;
  createdAt: string;
}

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('latest');
  const navigate = useNavigate();
  const { user } = useStore();

  useEffect(() => {
    // Basic frontend check. Real check happens on the backend.
    if (!user) {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  const fetchFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/admin/feedback?sort=${sort}&filter=${encodeURIComponent(filter)}`);
      setFeedback(data.feedback || []);
    } catch (e: any) {
      if (e.response?.status === 403 || e.response?.status === 401) {
        setError('Unauthorized: You are not an admin.');
      } else {
        setError('Failed to fetch feedback.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [sort, filter]);

  const deleteFeedback = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await api.delete(`/admin/feedback/${id}`);
      setFeedback(f => f.filter(item => item.id !== id));
    } catch (e) {
      console.error('Delete failed:', e);
      alert('Failed to delete feedback');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ padding: '8px', borderRadius: '50%' }}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <Shield size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 leading-none mb-1">Feedback Intel</h1>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Administrator Access</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search text, email, or name..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort by:</p>
            <select 
              value={sort} 
              onChange={(e) => setSort(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="latest">Latest</option>
              <option value="rating">Rating (Highest to lowest)</option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col items-center justify-center text-center">
          <AlertTriangle size={48} className="text-rose-500 mb-4" />
          <h3 className="text-lg font-bold text-rose-900 mb-2">{error}</h3>
          <p className="text-rose-700 max-w-sm mb-6">Your account lacks the necessary clearances to view this intelligence feed.</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors">
            Return to Dashboard
          </button>
        </div>
      ) : loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-slate-400 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold uppercase tracking-wider">Decrypting Comm-Logs...</p>
        </div>
      ) : feedback.length === 0 ? (
        <div className="py-20 text-center">
          <Shield size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No feedback entries found matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative group">
              <button 
                onClick={() => deleteFeedback(item.id)}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Delete entry"
              >
                <Trash2 size={18} />
              </button>
              
              <div className="pr-12">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={16} className={i <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                
                <p className="text-slate-900 text-base leading-relaxed mb-4">
                  "{item.message}"
                </p>
                
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                    {(item.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs font-bold text-slate-700">{item.name || 'Anonymous'}</p>
                  {item.email && <p className="text-xs text-slate-500 italic">&lt;{item.email}&gt;</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
