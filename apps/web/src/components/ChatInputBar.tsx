import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Mic, Sparkles, Map, HelpCircle } from 'lucide-react';

interface ChatInputBarProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
  loading?: boolean;
}

const QUICK_CHIPS = [
  { label: 'Create a new trip', icon: Sparkles },
  { label: 'Inspire me where to go', icon: Map },
  { label: 'Take a quiz', icon: HelpCircle },
];

export default function ChatInputBar({ onSubmit, placeholder, loading }: ChatInputBarProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = '56px';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }
  }, [message]);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Main Input Card */}
      <div
        className="w-full rounded-2xl shadow-elevated p-4 flex items-end gap-3"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Attachment button */}
        <button
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Attach file"
          type="button"
        >
          <Paperclip size={20} strokeWidth={1.5} />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Help me plan a trip to Tokyo for 5 days...'}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-[var(--color-text-muted)]"
          style={{
            color: 'var(--color-text-primary)',
            minHeight: '56px',
            maxHeight: '160px',
            fontFamily: 'Inter, sans-serif',
          }}
          disabled={loading}
        />

        {/* Action buttons */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Voice input"
            type="button"
          >
            <Mic size={20} strokeWidth={1.5} />
          </button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={!message.trim() || loading}
            className="h-10 px-5 rounded-xl flex items-center gap-2 text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: 'var(--color-brand-purple)' }}
          >
            {loading ? (
              <TypingIndicator />
            ) : (
              <>
                <Send size={16} strokeWidth={2} />
                Plan my trip
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_CHIPS.map((chip) => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.label}
              onClick={() => { setMessage(chip.label); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all hover:scale-[1.03]"
              style={{
                background: 'var(--color-brand-purple-light)',
                color: 'var(--color-brand-purple)',
                border: '1px solid transparent',
              }}
            >
              <Icon size={14} strokeWidth={2} />
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Chat Bubble Components ─── */

export function UserBubble({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, type: 'spring' }}
      className="flex justify-end"
    >
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-md text-sm text-white"
        style={{ background: 'var(--color-brand-purple)' }}
      >
        {message}
      </div>
    </motion.div>
  );
}

export function AiBubble({ message, children }: { message?: string; children?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, type: 'spring' }}
      className="flex justify-start"
    >
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-md text-sm"
        style={{
          background: 'var(--color-brand-purple-light)',
          color: 'var(--color-text-primary)',
        }}
      >
        {message || children}
      </div>
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-white/80"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
