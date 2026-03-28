import { useMemo, useState } from 'react';

type TripType =
  | 'Business'
  | 'Vacation'
  | 'Student Trip'
  | 'Family Holiday'
  | 'Honeymoon'
  | 'Backpacking'
  | 'Wellness Retreat'
  | 'Adventure';

type BudgetRange =
  | 'Budget (Under $500)'
  | 'Economy ($500 - $1,500)'
  | 'Comfort ($1,500 - $5,000)'
  | 'Premium ($5,000 - $15,000)'
  | 'Luxury ($15,000+)'
  | 'Flexible / Not Sure';

type ExperienceType =
  | 'Cultural & Heritage'
  | 'Food & Culinary'
  | 'Nature & Wildlife'
  | 'Nightlife & Entertainment'
  | 'Shopping'
  | 'Water Sports & Beach'
  | 'Trekking & Outdoor Adventure'
  | 'Arts & Festivals'
  | 'Spa & Wellness'
  | 'Photography & Sightseeing'
  | 'Sports Events'
  | 'Off-the-beaten-path / Hidden Gems';

export interface TravelProfile {
  trip_type: TripType;
  origin: string;
  destination: string;
  budget_range: BudgetRange;
  preferred_currency: string;
  experience_types: ExperienceType[];
}

type ChatMsg = { role: 'ai' | 'user'; text: string };

const TRIP_TYPE_OPTIONS: Array<{ label: string; value: TripType }> = [
  { label: '🧳 Business', value: 'Business' },
  { label: '🏖️ Vacation', value: 'Vacation' },
  { label: '🎓 Student Trip', value: 'Student Trip' },
  { label: '👨‍👩‍👧 Family Holiday', value: 'Family Holiday' },
  { label: '💍 Honeymoon', value: 'Honeymoon' },
  { label: '🎒 Backpacking', value: 'Backpacking' },
  { label: '🧘 Wellness Retreat', value: 'Wellness Retreat' },
  { label: '🏔️ Adventure', value: 'Adventure' },
];

const BUDGET_OPTIONS: Array<{ label: string; value: BudgetRange }> = [
  { label: '💸 Budget (Under $500)', value: 'Budget (Under $500)' },
  { label: '🪙 Economy ($500 - $1,500)', value: 'Economy ($500 - $1,500)' },
  { label: '✈️ Comfort ($1,500 - $5,000)', value: 'Comfort ($1,500 - $5,000)' },
  { label: '🥂 Premium ($5,000 - $15,000)', value: 'Premium ($5,000 - $15,000)' },
  { label: '👑 Luxury ($15,000+)', value: 'Luxury ($15,000+)' },
  { label: '🤷 Flexible / Not Sure', value: 'Flexible / Not Sure' },
];

const EXPERIENCE_OPTIONS: Array<{ label: string; value: ExperienceType }> = [
  { label: '🏛️ Cultural & Heritage', value: 'Cultural & Heritage' },
  { label: '🍜 Food & Culinary', value: 'Food & Culinary' },
  { label: '🌿 Nature & Wildlife', value: 'Nature & Wildlife' },
  { label: '🎉 Nightlife & Entertainment', value: 'Nightlife & Entertainment' },
  { label: '🛍️ Shopping', value: 'Shopping' },
  { label: '🏄 Water Sports & Beach', value: 'Water Sports & Beach' },
  { label: '🧗 Trekking & Outdoor Adventure', value: 'Trekking & Outdoor Adventure' },
  { label: '🎭 Arts & Festivals', value: 'Arts & Festivals' },
  { label: '🧖 Spa & Wellness', value: 'Spa & Wellness' },
  { label: '📸 Photography & Sightseeing', value: 'Photography & Sightseeing' },
  { label: '🏟️ Sports Events', value: 'Sports Events' },
  { label: '🧪 Off-the-beaten-path / Hidden Gems', value: 'Off-the-beaten-path / Hidden Gems' },
];

const CURRENCIES = [
  'USD 🇺🇸', 'EUR 🇪🇺', 'GBP 🇬🇧', 'INR 🇮🇳', 'AED 🇦🇪', 'SGD 🇸🇬',
  'AUD 🇦🇺', 'JPY 🇯🇵', 'CAD 🇨🇦', 'MYR 🇲🇾', 'THB 🇹🇭', 'ZAR 🇿🇦',
];

const PLACES = [
  'New York (JFK)', 'London (LHR)', 'Paris (CDG)', 'Dubai (DXB)', 'Singapore (SIN)',
  'Mumbai (BOM)', 'Delhi (DEL)', 'Bangkok (BKK)', 'Tokyo (HND)', 'Sydney (SYD)',
  'Kuala Lumpur (KUL)', 'Toronto (YYZ)', 'San Francisco (SFO)', 'Istanbul (IST)',
  'Bali (DPS)', 'Rome (FCO)', 'Cape Town (CPT)', 'Zurich (ZRH)', 'Doha (DOH)',
];

function budgetContext(v: BudgetRange) {
  const map: Record<BudgetRange, string> = {
    'Budget (Under $500)': 'Great choice! We can focus on smart stays, local transit, and value-packed experiences.',
    'Economy ($500 - $1,500)': 'Nice! This gives you reliable comfort with room for must-do activities.',
    'Comfort ($1,500 - $5,000)': 'Great! A Comfort budget gives you solid hotel options and a few premium experiences.',
    'Premium ($5,000 - $15,000)': 'Excellent! Premium unlocks upscale stays and curated experiences with flexibility.',
    'Luxury ($15,000+)': 'Amazing! Luxury gives you top-tier stays, private transfers, and signature moments.',
    'Flexible / Not Sure': 'No worries. We will keep options open and optimize as your preferences become clearer.',
  };
  return map[v];
}

function inferPersona(p: TravelProfile) {
  if (p.trip_type === 'Business') return 'the efficient jet-setter';
  if (p.trip_type === 'Honeymoon') return 'the romantic explorer';
  if (p.trip_type === 'Backpacking') return 'the free-spirited adventurer';
  if (p.trip_type === 'Wellness Retreat') return 'the mindful traveler';
  if (p.trip_type === 'Family Holiday') return 'the family memory-maker';
  return 'the curious global traveler';
}

function makeRecommendations(p: TravelProfile): string[] {
  const recs: string[] = [];
  recs.push(`Prioritize 1-2 anchor experiences in ${p.destination} that match ${p.experience_types[0] || 'your interests'}.`);
  if (p.budget_range.includes('Budget') || p.budget_range.includes('Economy')) {
    recs.push('Book flights and stays early, and choose transit-connected neighborhoods to stretch value.');
  } else if (p.budget_range.includes('Luxury') || p.budget_range.includes('Premium')) {
    recs.push('Reserve premium stays and pre-book high-demand experiences for seamless travel days.');
  } else {
    recs.push('Balance one premium highlight with flexible daily activities to keep variety and comfort.');
  }
  if (p.experience_types.includes('Food & Culinary')) recs.push('Add a local food walk or market tour in your first 48 hours.');
  if (p.experience_types.includes('Nature & Wildlife') || p.experience_types.includes('Trekking & Outdoor Adventure')) {
    recs.push('Keep one sunrise or early-morning outdoor slot for better weather and fewer crowds.');
  }
  if (p.trip_type === 'Business') recs.push('Build a light evening plan near your stay to avoid transit fatigue.');
  if (recs.length < 3) recs.push('Keep your first day lighter to adapt smoothly before full activity days.');
  return recs.slice(0, 5);
}

export default function TravelChatbot({
  onChatComplete,
}: {
  onChatComplete?: (travelProfile: TravelProfile) => void;
}) {
  const [step, setStep] = useState(1);
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'ai', text: 'Welcome aboard! 🌍 What kind of trip are you planning?' },
  ]);
  const [answers, setAnswers] = useState<Partial<TravelProfile>>({});

  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const [currencyQuery, setCurrencyQuery] = useState('');
  const [showCurrency, setShowCurrency] = useState(false);
  const [selectedExperiences, setSelectedExperiences] = useState<ExperienceType[]>([]);

  const fromOptions = useMemo(() => PLACES.filter(x => x.toLowerCase().includes(fromInput.toLowerCase())).slice(0, 8), [fromInput]);
  const toOptions = useMemo(() => PLACES.filter(x => x.toLowerCase().includes(toInput.toLowerCase())).slice(0, 8), [toInput]);
  const currencyOptions = useMemo(() => CURRENCIES.filter(x => x.toLowerCase().includes(currencyQuery.toLowerCase())), [currencyQuery]);

  const pushAi = (text: string) => setMessages(prev => [...prev, { role: 'ai', text }]);
  const pushUser = (text: string) => setMessages(prev => [...prev, { role: 'user', text }]);

  const advance = (nextStep: number, nextQuestion: string) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      pushAi(nextQuestion);
      setStep(nextStep);
    }, 520);
  };

  const complete = (profile: TravelProfile) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setStep(6);
      onChatComplete?.(profile);
    }, 520);
  };

  const btnStyle = (active = false) => ({
    minHeight: 44,
    borderRadius: 10,
    padding: '10px 14px',
    border: active ? '1.5px solid #e55803' : '1.5px solid #f0dfc0',
    background: active ? '#fde8d8' : '#fff',
    color: '#0e2125',
    fontSize: 13,
    fontWeight: 600 as const,
    textAlign: 'left' as const,
    width: '100%',
    justifyContent: 'flex-start',
  });

  return (
    <div className="r-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ maxHeight: 460, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 2px' }}>
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'ai' ? 'bubble-ai' : 'bubble-user'} style={{ whiteSpace: 'pre-line', maxWidth: '88%' }}>
            {m.text}
          </div>
        ))}
        {typing && (
          <div className="bubble-ai" style={{ width: 90, display: 'flex', gap: 6 }}>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
      </div>

      {!typing && step === 1 && (
        <div style={{ display: 'grid', gap: 8 }} className="grid grid-cols-1 lg-grid-cols-2">
          {TRIP_TYPE_OPTIONS.map(o => (
            <button key={o.value} style={btnStyle(answers.trip_type === o.value)} onClick={() => {
              setAnswers(prev => ({ ...prev, trip_type: o.value }));
              pushUser(o.label);
              advance(2, 'Where are you flying from and heading to?');
            }}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {!typing && step === 2 && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <input
              className="r-input"
              placeholder="From — city or airport"
              value={fromInput}
              onFocus={() => setShowFrom(true)}
              onChange={(e) => { setFromInput(e.target.value); setShowFrom(true); }}
            />
            {showFrom && fromOptions.length > 0 && (
              <div className="travel-dd">
                {fromOptions.map(o => <button key={o} className="travel-dd-item" onClick={() => { setFromInput(o); setShowFrom(false); }}>{o}</button>)}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              className="r-input"
              placeholder="To — city or airport"
              value={toInput}
              onFocus={() => setShowTo(true)}
              onChange={(e) => { setToInput(e.target.value); setShowTo(true); }}
            />
            {showTo && toOptions.length > 0 && (
              <div className="travel-dd">
                {toOptions.map(o => <button key={o} className="travel-dd-item" onClick={() => { setToInput(o); setShowTo(false); }}>{o}</button>)}
              </div>
            )}
          </div>
          <button className="btn btn-primary" disabled={!fromInput || !toInput} onClick={() => {
            setAnswers(prev => ({ ...prev, origin: fromInput, destination: toInput }));
            pushUser(`From: ${fromInput}\nTo: ${toInput}`);
            advance(3, "What's your travel budget range?");
          }}>
            Confirm Route
          </button>
        </div>
      )}

      {!typing && step === 3 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {BUDGET_OPTIONS.map(o => (
            <button key={o.value} style={btnStyle(answers.budget_range === o.value)} onClick={() => {
              setAnswers(prev => ({ ...prev, budget_range: o.value }));
              pushUser(o.label);
              pushAi(budgetContext(o.value));
              advance(4, 'Which currency would you like to use for all pricing?');
            }}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {!typing && step === 4 && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <input
              className="r-input"
              placeholder="Search currency"
              value={currencyQuery}
              onFocus={() => setShowCurrency(true)}
              onChange={(e) => { setCurrencyQuery(e.target.value); setShowCurrency(true); }}
            />
            {showCurrency && (
              <div className="travel-dd">
                {currencyOptions.map(c => (
                  <button key={c} className="travel-dd-item" onClick={() => {
                    setCurrencyQuery(c);
                    setShowCurrency(false);
                  }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-primary" disabled={!currencyQuery} onClick={() => {
            setAnswers(prev => ({ ...prev, preferred_currency: currencyQuery }));
            pushUser(currencyQuery);
            advance(5, 'What kind of experiences are you hoping for on this trip? (Select all that apply)');
          }}>
            Confirm Currency
          </button>
        </div>
      )}

      {!typing && step === 5 && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gap: 8 }} className="grid grid-cols-1 lg-grid-cols-2">
            {EXPERIENCE_OPTIONS.map(o => {
              const active = selectedExperiences.includes(o.value);
              return (
                <button
                  key={o.value}
                  style={btnStyle(active)}
                  onClick={() => {
                    setSelectedExperiences(prev => prev.includes(o.value) ? prev.filter(v => v !== o.value) : [...prev, o.value]);
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <button className="btn btn-primary" disabled={selectedExperiences.length === 0} onClick={() => {
            pushUser(selectedExperiences.join(', '));
            const finalProfile: TravelProfile = {
              trip_type: answers.trip_type as TripType,
              origin: answers.origin as string,
              destination: answers.destination as string,
              budget_range: answers.budget_range as BudgetRange,
              preferred_currency: answers.preferred_currency as string,
              experience_types: selectedExperiences,
            };
            setAnswers(finalProfile);
            complete(finalProfile);
          }}>
            Finish Profile
          </button>
        </div>
      )}

      {step === 6 && answers.trip_type && answers.destination && answers.origin && answers.budget_range && answers.preferred_currency && answers.experience_types && (
        <div style={{ border: '1px solid #f0dfc0', borderRadius: 14, background: '#fffbf4', padding: 14 }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: '#0e2125', marginBottom: 8 }}>
            {"Here's your travel profile, "}{inferPersona(answers as TravelProfile)}!
          </p>
          <div style={{ fontSize: 13, color: '#6b5c45', lineHeight: 1.5, marginBottom: 10 }}>
            <div><strong>Trip Type:</strong> {answers.trip_type}</div>
            <div><strong>Route:</strong> {answers.origin} → {answers.destination}</div>
            <div><strong>Budget:</strong> {answers.budget_range}</div>
            <div><strong>Currency:</strong> {answers.preferred_currency}</div>
            <div><strong>Experiences:</strong> {(answers.experience_types as ExperienceType[]).join(', ')}</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            {makeRecommendations(answers as TravelProfile).map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: '#0e2125', marginBottom: 6 }}>• {r}</div>
            ))}
          </div>
          <p style={{ fontWeight: 700, color: '#e55803', fontSize: 14 }}>
            Ready to build your full itinerary? Let&apos;s go! 🚀
          </p>
        </div>
      )}
    </div>
  );
}
