import { useState } from 'react';
import { Mail, Star, Send, ShieldPlus } from 'lucide-react';
import { useStore } from '../stores/useStore';
import api from '../lib/api';

export default function LeaveFeedback() {
  const { user } = useStore();
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please provide some feedback');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/feedback', {
        name: user?.name || 'Anonymous traveler',
        email: user?.email || '',
        rating,
        message,
      });
      setSuccess(true);
      setMessage('');
    } catch {
      setError('Failed to submit feedback. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 24px', maxWidth: 640 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, color: '#0e2125', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Mail style={{ color: '#e55803' }} /> Leave Feedback
        </h1>
        <p style={{ color: '#6b5c45', fontSize: 16, marginTop: 8 }}>
          Tell us how Roamie is helping your travels!
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 8px 30px rgba(14,33,37,0.06)', border: '1px solid #f0dfc0' }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fde8d8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Star size={32} style={{ color: '#e55803', fill: '#e55803' }} />
            </div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#0e2125', marginBottom: 12 }}>Thank you!</h3>
            <p style={{ color: '#6b5c45', fontSize: 15 }}>Your insights have been securely transmitted to our team.</p>
            <button
              onClick={() => setSuccess(false)}
              style={{ marginTop: 24, padding: '10px 20px', background: '#0e2125', color: '#fff', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              Submit Another
            </button>
          </div>
        ) : (
          <form onSubmit={submitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b5c45', marginBottom: 8 }}>
                Experience Rating
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRating(r)}
                    style={{
                      width: 44, height: 44, borderRadius: 12, border: '2px solid transparent', cursor: 'pointer',
                      background: r <= rating ? '#fde8d8' : '#f5e8ca',
                      borderColor: r <= rating ? '#e55803' : 'transparent',
                      color: r <= rating ? '#e55803' : '#bca586',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <Star size={22} style={r <= rating ? { fill: '#e55803' } : {}} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b5c45', marginBottom: 8 }}>
                Your Message
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="What did you love? What could be better?"
                style={{ width: '100%', minHeight: 140, padding: 16, borderRadius: 16, border: '1px solid #f0dfc0', background: '#fffbf4', fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: '#0e2125', resize: 'vertical' }}
              />
            </div>

            {error && <p style={{ color: '#e63946', fontSize: 14, fontWeight: 600 }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ padding: '14px', borderRadius: 16, background: '#e55803', color: '#fff', border: 'none', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1 }}
            >
              {loading ? 'Submitting...' : <><Send size={18} /> Submit Feedback</>}
            </button>
          </form>
        )}
      </div>

      {user?.isAdmin && (
         <div style={{ marginTop: 32, padding: 20, background: '#f5e8ca', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 14, color: '#0e2125' }}><ShieldPlus size={16} style={{ display: 'inline', marginRight: 6, opacity: 0.7 }} /> Admin Access</p>
              <p style={{ fontSize: 13, color: '#6b5c45' }}>You have clearance to view all intelligence feedback.</p>
            </div>
            <a href="/admin/feedback" style={{ padding: '8px 16px', background: '#0e2125', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
              Intel Logs
            </a>
         </div>
      )}
    </div>
  );
}
