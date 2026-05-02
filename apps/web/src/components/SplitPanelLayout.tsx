import { type ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRightOpen } from 'lucide-react';

interface SplitPanelLayoutProps {
  left: ReactNode;
  right: ReactNode;
  leftWidth?: string;   // e.g. '40%'
  rightWidth?: string;  // e.g. '60%'
  className?: string;
}

/**
 * SplitPanelLayout — PRD Section 4.3
 * Desktop: side-by-side panels (40/60 default)
 * Tablet: single column, right panel tabbed below
 * Mobile: right panel hidden, floating "Preview" button
 */
export default function SplitPanelLayout({
  left,
  right,
  leftWidth = '40%',
  rightWidth = '60%',
  className = '',
}: SplitPanelLayoutProps) {
  const [mobilePreview, setMobilePreview] = useState(false);

  return (
    <>
      <div
        className={`w-full h-full ${className}`}
        style={{ display: 'grid' }}
      >
        {/* Desktop: side-by-side grid */}
        <div
          className="hidden lg:grid h-full gap-0"
          style={{
            gridTemplateColumns: `${leftWidth} ${rightWidth}`,
          }}
        >
          <div className="overflow-y-auto">{left}</div>
          <div className="overflow-y-auto border-l" style={{ borderColor: 'var(--color-border)' }}>
            {right}
          </div>
        </div>

        {/* Tablet: stacked */}
        <div className="hidden md:flex lg:hidden flex-col h-full">
          <div className="flex-1 overflow-y-auto">{left}</div>
          <div
            className="border-t overflow-y-auto"
            style={{ borderColor: 'var(--color-border)', maxHeight: '50vh' }}
          >
            {right}
          </div>
        </div>

        {/* Mobile: left only, right hidden behind button */}
        <div className="flex md:hidden flex-col h-full relative">
          <div className="flex-1 overflow-y-auto">{left}</div>
        </div>
      </div>

      {/* Mobile: Floating Preview button */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setMobilePreview(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-elevated"
          style={{ background: 'var(--color-brand-purple)' }}
          aria-label="Open preview panel"
        >
          <PanelRightOpen size={20} />
        </motion.button>
      </div>

      {/* Mobile: Preview panel overlay */}
      <AnimatePresence>
        {mobilePreview && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 md:hidden"
              onClick={() => setMobilePreview(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 md:hidden rounded-t-3xl overflow-hidden"
              style={{
                background: 'var(--color-bg-card)',
                maxHeight: '85vh',
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
              </div>
              <div className="overflow-y-auto px-4 pb-8" style={{ maxHeight: 'calc(85vh - 32px)' }}>
                {right}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
