import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Building2, MapPin, Utensils, Camera, ShoppingBag,
  Coffee, Briefcase, Bus, ChevronDown, Plus,
  type LucideIcon,
} from 'lucide-react';

/* ─── Types ─── */
interface TimelineEvent {
  time: string;
  duration_minutes: number;
  type: string;
  title: string;
  description: string;
  location: string;
  estimatedCost?: number;
  isGapSuggestion?: boolean;
  isBreathingRoom?: boolean;
  culturalNudge?: string;
  userAdded?: boolean;
}

interface TimelineDay {
  id: string;
  date: string;
  events: TimelineEvent[];
  estimatedDayCost?: number;
}

interface ItineraryTimelineProps {
  days: TimelineDay[];
  currency?: string;
  onAddActivity?: (dayId: string) => void;
  onEventClick?: (dayId: string, event: TimelineEvent) => void;
}

/* ─── Type → colour + icon mapping ─── */
const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: LucideIcon }> = {
  activity:    { color: '#5B5FEC', bg: '#EEF0FF', icon: MapPin },
  sightseeing: { color: '#5B5FEC', bg: '#EEF0FF', icon: Camera },
  food:        { color: '#F59E0B', bg: '#FFF8E7', icon: Utensils },
  transport:   { color: '#F59E0B', bg: '#FFF8E7', icon: Bus },
  break:       { color: '#10B981', bg: '#ECFDF5', icon: Coffee },
  meeting:     { color: '#6366F1', bg: '#EEF2FF', icon: Briefcase },
  shopping:    { color: '#EC4899', bg: '#FDF2F8', icon: ShoppingBag },
  flight:      { color: '#F59E0B', bg: '#FFF8E7', icon: Plane },
  hotel:       { color: '#5B5FEC', bg: '#EEF0FF', icon: Building2 },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.activity;
}

/* ─── Main Component ─── */
export default function ItineraryTimeline({
  days,
  currency = 'INR',
  onAddActivity,
  onEventClick,
}: ItineraryTimelineProps) {
  return (
    <div className="space-y-8 py-4">
      {days.map((day, dayIdx) => (
        <DaySection
          key={day.id}
          day={day}
          dayNumber={dayIdx + 1}
          currency={currency}
          onAddActivity={onAddActivity}
          onEventClick={onEventClick}
        />
      ))}
    </div>
  );
}

/* ─── Day Section ─── */
function DaySection({
  day,
  dayNumber,
  currency,
  onAddActivity,
  onEventClick,
}: {
  day: TimelineDay;
  dayNumber: number;
  currency: string;
  onAddActivity?: (dayId: string) => void;
  onEventClick?: (dayId: string, event: TimelineEvent) => void;
}) {
  const dateObj = new Date(day.date);
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div>
      {/* Day Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
            Day {dayNumber}
          </span>
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            — {weekday}, {dateStr}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {day.estimatedDayCost != null && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--color-brand-amber-light)', color: '#92400E' }}>
              ~{currency === 'INR' ? '₹' : '$'}{day.estimatedDayCost.toLocaleString()}
            </span>
          )}
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-brand-purple-light)', color: 'var(--color-brand-purple)' }}>
            {day.events.length} activities
          </span>
        </div>
      </div>

      {/* Timeline nodes */}
      <div className="relative pl-8">
        {/* Connector line */}
        <div
          className="absolute left-[19px] top-4 bottom-4 w-[2px]"
          style={{ background: 'var(--color-border)', borderStyle: 'dashed' }}
        />

        <div className="space-y-3">
          {day.events.map((event, i) => (
            <TimelineNode
              key={`${day.id}-${i}`}
              event={event}
              currency={currency}
              onClick={() => onEventClick?.(day.id, event)}
            />
          ))}
        </div>
      </div>

      {/* Add activity button */}
      {onAddActivity && (
        <button
          onClick={() => onAddActivity(day.id)}
          className="mt-3 ml-8 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            color: 'var(--color-brand-purple)',
            border: '1px dashed var(--color-border)',
          }}
        >
          <Plus size={14} /> Add activity
        </button>
      )}
    </div>
  );
}

/* ─── Timeline Node ─── */
function TimelineNode({
  event,
  currency,
  onClick,
}: {
  event: TimelineEvent;
  currency: string;
  onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = getConfig(event.type);
  const Icon = config.icon;

  // Flight / Hotel get special full-width treatment
  const isSpecial = event.type === 'flight' || event.type === 'hotel';

  return (
    <div className="relative flex items-start gap-3">
      {/* Node circle */}
      <div
        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 -ml-8"
        style={{
          background: config.bg,
          borderColor: config.color,
          color: config.color,
        }}
      >
        <Icon size={18} strokeWidth={1.5} />
      </div>

      {/* Card */}
      <motion.div
        layout
        className={`flex-1 rounded-2xl cursor-pointer transition-shadow ${
          isSpecial ? 'shadow-elevated' : ''
        }`}
        style={{
          background: isSpecial ? config.bg : 'var(--color-bg-card)',
          border: `1px solid ${isSpecial ? config.color + '40' : 'var(--color-border)'}`,
          boxShadow: isSpecial ? undefined : '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        }}
        onClick={() => { setExpanded(!expanded); onClick(); }}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Time pill */}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: config.bg, color: config.color }}>
                  {event.time}
                </span>
                <h4 className="font-display font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {event.title}
                </h4>
              </div>
              <p className="text-xs mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
                📍 {event.location}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {event.estimatedCost != null && event.estimatedCost > 0 && (
                <span className="text-xs font-semibold" style={{ color: 'var(--color-brand-amber)' }}>
                  ~{currency === 'INR' ? '₹' : '$'}{event.estimatedCost}
                </span>
              )}
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />
              </motion.div>
            </div>
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' as any }}
                className="overflow-hidden"
              >
                <div className="pt-3 mt-3 space-y-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {event.description}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full" style={{ background: config.bg, color: config.color }}>
                      {event.duration_minutes} min
                    </span>
                    <span className="px-2 py-0.5 rounded-full capitalize" style={{ background: config.bg, color: config.color }}>
                      {event.type}
                    </span>
                    {event.userAdded && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                        Custom
                      </span>
                    )}
                  </div>
                  {event.culturalNudge && (
                    <p className="text-xs italic" style={{ color: 'var(--color-brand-amber)' }}>
                      💡 {event.culturalNudge}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
