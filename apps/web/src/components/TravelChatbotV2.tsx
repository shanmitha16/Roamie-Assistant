import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { useStore } from '../stores/useStore';
import api from '../lib/api';
import countries from 'world-countries';

type TripType =
  | 'Business Trip'
  | 'Leisure Vacation'
  | 'Adventure Travel'
  | 'Honeymoon / Romance'
  | 'Family Holiday'
  | 'Solo Backpacking'
  | 'Cultural & Heritage Tour'
  | 'Road Trip'
  | 'Cruise'
  | 'Wellness & Retreat';

type CurrencyCode = string;

type ExperienceType =
  | 'Beach & Relaxation'
  | 'Adventure & Extreme Sports'
  | 'Culture & History'
  | 'Food & Culinary Tours'
  | 'Nightlife & Entertainment'
  | 'Nature & Wildlife'
  | 'Shopping'
  | 'Spiritual & Wellness'
  | 'Photography & Sightseeing'
  | 'Local Hidden Gems'
  | 'Luxury & Fine Dining'
  | 'Budget Backpacking'
  | 'Family-Friendly Activities'
  | 'Festivals & Events';

export interface TravelDetails {
  trip_type: TripType;
  destination: string;
  departure_date: string; // YYYY-MM-DD
  return_date: string; // YYYY-MM-DD
  travellers: number;
  budget_amount: number;
  currency: CurrencyCode; // e.g. USD, EUR, INR
  experiences: ExperienceType[];
}

type ChatMsg = { role: 'ai' | 'user'; text: string };

const TRIP_TYPE_OPTIONS: TripType[] = [
  'Business Trip',
  'Leisure Vacation',
  'Adventure Travel',
  'Honeymoon / Romance',
  'Family Holiday',
  'Solo Backpacking',
  'Cultural & Heritage Tour',
  'Road Trip',
  'Cruise',
  'Wellness & Retreat',
];

const COUNTRY_LIST: string[] = (countries as any[])
  .map((c: any) => c?.name?.common)
  .filter(Boolean)
  .sort((a: string, b: string) => a.localeCompare(b));

const POPULAR_DESTINATIONS = [
  'Paris',
  'Bali',
  'Tokyo',
  'Dubai',
  'New York',
  'Maldives',
  'Rome',
  'Bangkok',
  'Cape Town',
  'Sydney',
];

const CURRENCY_CHIPS: Array<{ code: CurrencyCode; display: string }> = [
  { code: 'USD', display: 'USD $' },
  { code: 'EUR', display: 'EUR €' },
  { code: 'GBP', display: 'GBP £' },
  { code: 'INR', display: 'INR ₹' },
  { code: 'AED', display: 'AED د.إ' },
  { code: 'JPY', display: 'JPY ¥' },
  { code: 'AUD', display: 'AUD A$' },
  { code: 'CAD', display: 'CAD C$' },
  { code: 'SGD', display: 'SGD S$' },
  { code: 'THB', display: 'THB ฿' },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AED: 'د.إ',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  THB: '฿',
};

const EXPERIENCE_OPTIONS: ExperienceType[] = [
  'Beach & Relaxation',
  'Adventure & Extreme Sports',
  'Culture & History',
  'Food & Culinary Tours',
  'Nightlife & Entertainment',
  'Nature & Wildlife',
  'Shopping',
  'Spiritual & Wellness',
  'Photography & Sightseeing',
  'Local Hidden Gems',
  'Luxury & Fine Dining',
  'Budget Backpacking',
  'Family-Friendly Activities',
  'Festivals & Events',
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parseCurrencyCode(raw: string): CurrencyCode {
  const cleaned = (raw || '').trim().toUpperCase();
  if (!cleaned) return '';
  // allow "USD" / "usd" / "INR ₹" etc.
  const letters = cleaned.replace(/[^A-Z]/g, '');
  return letters || cleaned.split(/\s+/)[0];
}

function formatMoney(amount: number, currency: CurrencyCode) {
  const sym = CURRENCY_SYMBOLS[currency] || '';
  const rounded = Number.isFinite(amount) ? amount : 0;
  const safe = Math.max(0, rounded);
  const formatted = safe.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return sym ? `${sym}${formatted}` : `${formatted} ${currency}`;
}

function daysBetweenInclusive(start: string, end: string) {
  if (!start || !end) return 0;
  const s = new Date(start + 'T00:00:00').getTime();
  const e = new Date(end + 'T00:00:00').getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return 0;
  if (e < s) return 0;
  const ms = e - s;
  return Math.floor(ms / 86400000) + 1;
}

function seededPick<T>(arr: T[], seed: string, idx: number) {
  if (arr.length === 0) return arr[0] as T;
  let h = 0;
  const base = seed + '|' + idx;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  const pick = h % arr.length;
  return arr[pick];
}

function getTripVibe(tripType: TripType) {
  switch (tripType) {
    case 'Business Trip':
      return 'efficient and low-friction';
    case 'Honeymoon / Romance':
      return 'romantic and unhurried';
    case 'Adventure Travel':
      return 'active, outdoorsy, and adrenaline-friendly';
    case 'Family Holiday':
      return 'kid-friendly with smart pacing';
    case 'Solo Backpacking':
      return 'flexible, social, and value-lean';
    case 'Cultural & Heritage Tour':
      return 'museum-forward with historic neighborhoods';
    case 'Road Trip':
      return 'scenic drives with memorable stops';
    case 'Cruise':
      return 'easy days with curated ports';
    case 'Wellness & Retreat':
      return 'calm, restorative, and mindful';
    default:
      return 'balanced and fun';
  }
}

function bestTimeToVisit(destination: string, departureDate: string) {
  const d = (destination || '').toLowerCase();
  const m = departureDate ? new Date(departureDate + 'T00:00:00').getMonth() : new Date().getMonth();
  // m: 0=Jan
  const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][clamp(m, 0, 11)];

  if (d.includes('dubai')) return `Best vibes: Nov–Mar. Since you depart around ${monthName}, plan for warm afternoons and cooler evenings.`;
  if (d.includes('bali')) return `Best vibes: Apr–Oct (drier season). Around ${monthName}, pack a light rain layer just in case.`;
  if (d.includes('maldives')) return `Best vibes: Dec–Apr. Around ${monthName}, expect breezy, beach-friendly days with tropical showers possible.`;
  if (d.includes('paris') || d.includes('rome') || d.includes('london') || d.includes('athens')) {
    return `Best vibes: spring/fall. With ${monthName} weather, aim for early tours and longer, relaxed evenings.`;
  }
  if (d.includes('tokyo') || d.includes('sydney') || d.includes('new york')) {
    return `Best vibes: shoulder seasons. Around ${monthName}, you’ll get more comfortable walking days—start mornings early.`;
  }
  if (d.includes('cape town')) return `Best vibes: Nov–Mar for summer energy, or May–Sep for crisp views. For your ${monthName} departure, bring a light jacket for evenings.`;
  return `Best vibes: generally spring/fall. For ${monthName} departure, prioritize indoor backups for hot/cold days and plan flexible mornings.`;
}

function practicalTips(destination: string, departureDate: string) {
  const localCustoms = (() => {
    const d = (destination || '').toLowerCase();
    if (d.includes('dubai') || d.includes('uae')) return 'Dress modestly in public spaces, especially around religious sites. Respect local customs during prayer times.';
    if (d.includes('japan') || d.includes('tokyo') || d.includes('kyoto')) return 'Keep it respectful: quiet transport, neat lines, and follow posted rules in stations and temples.';
    if (d.includes('bali') || d.includes('indonesia')) return 'Be mindful at temples (sarang/wrap, cover shoulders). Avoid disrupting ceremonies—always follow posted guidance.';
    if (d.includes('maldives')) return 'Use reef-safe options where possible. Check local rules for modest swimwear on inhabited islands.';
    return 'A good rule of thumb: be respectful at religious sites, watch how locals greet/queue, and keep a small layer for sudden weather changes.';
  })();

  const visaRequirements = (() => {
    return 'Visa rules depend on your passport and trip length. Check the official government/embassy site for your nationality 4–6 weeks before departure (and keep proof of onward travel/hotel handy).';
  })();

  return {
    bestTime: bestTimeToVisit(destination, departureDate),
    localCustoms,
    visaRequirements,
    weatherNotes: 'Plan weather buffers: one flexible “slow day” per 2–3 active days, and carry a compact rain/wind layer. For comfort, schedule outdoor highlights before midday when possible.',
  };
}

function makeTopExperiences(experiences: ExperienceType[], destination: string, tripType: TripType) {
  const picks: string[] = [];
  const add = (s: string) => {
    if (!picks.includes(s)) picks.push(s);
  };

  if (experiences.includes('Culture & History')) add(`Historic core stroll in ${destination} with guided context`);
  if (experiences.includes('Food & Culinary Tours')) add(`Local market + tasting route (street food + hidden gems)`);
  if (experiences.includes('Nature & Wildlife')) add(`A nature escape: viewpoints, coastal paths, or a wildlife-focused outing`);
  if (experiences.includes('Photography & Sightseeing')) add(`Golden-hour photo loop: skyline + signature landmarks`);
  if (experiences.includes('Nightlife & Entertainment')) add(`Evening picks: live music, cocktails, or night markets`);
  if (experiences.includes('Shopping')) add(`Shopping circuit: artisan streets + curated local stores`);
  if (experiences.includes('Beach & Relaxation')) add(`Beach downtime: one “no-rush” afternoon for recovery`);
  if (experiences.includes('Spiritual & Wellness')) add(`Mind-body session: wellness class, spa time, or meditation spot`);
  if (experiences.includes('Adventure & Extreme Sports')) add(`Adrenaline highlight: activity day with experienced operators`);
  if (experiences.includes('Local Hidden Gems')) add(`Hidden-gem detour: a lesser-known neighborhood you’ll remember`);
  if (experiences.includes('Luxury & Fine Dining')) add(`Signature dining moment: a fine-dining or chef’s table experience`);
  if (experiences.includes('Budget Backpacking')) add(`Value-day strategy: free/cheap highlights + efficient transport`);
  if (experiences.includes('Family-Friendly Activities')) add(`Family-friendly day: interactive attractions + easy logistics`);
  if (experiences.includes('Festivals & Events')) add(`Festival-ready schedule: time your sightseeing around local events`);

  if (picks.length < 4) add(`Signature introduction day in ${destination}`);
  if (tripType === 'Honeymoon / Romance') add('A romantic evening plan with minimal transit');
  if (tripType === 'Business Trip') add('A smooth, low-fatigue schedule near your base');

  return picks.slice(0, 6);
}

function chooseActivityTemplates(experiences: ExperienceType[], tripType: TripType, destination: string) {
  const d = destination || 'your destination';

  const templates = {
    morning: [] as string[],
    afternoon: [] as string[],
    evening: [] as string[],
  };

  const add = (bucket: keyof typeof templates, items: string[]) => {
    templates[bucket].push(...items);
  };

  // Morning
  if (experiences.includes('Culture & History')) add('morning', [`Start with a guided historic walk in ${d}`, `Museum/old-town morning in ${d}`]);
  if (experiences.includes('Food & Culinary Tours')) add('morning', [`Breakfast tasting + local coffee culture`, `Visit a morning market in ${d}`]);
  if (experiences.includes('Nature & Wildlife')) add('morning', [`Sunrise viewpoint or park loop`, `Nature walk with photo stops`]);
  if (experiences.includes('Photography & Sightseeing')) add('morning', [`Golden-hour photo hunt (quiet routes)`, `Iconic landmark + best-angle overview`]);
  if (experiences.includes('Beach & Relaxation')) add('morning', [`Early beach time: calm waters + relaxed start`, `Coastal walk with shade breaks`]);
  if (experiences.includes('Adventure & Extreme Sports')) add('morning', [`Adrenaline activity briefing + session start`, `Outdoor adventure with experienced guides`]);
  if (experiences.includes('Spiritual & Wellness')) add('morning', [`Yoga or meditation session`, `Wellness morning with a calm café`]);
  if (experiences.includes('Budget Backpacking')) add('morning', [`Free/low-cost highlights morning (timed entries)`, `Neighborhood wander + public transport “hack”`]);
  if (experiences.includes('Family-Friendly Activities')) add('morning', [`Kid-friendly attraction with minimal lines`, `Play-friendly morning park stop`]);
  if (experiences.includes('Festivals & Events')) add('morning', [`Festival morning market exploration`, `Cultural performances/activations (early arrival)`]);

  // Afternoon
  if (experiences.includes('Food & Culinary Tours')) add('afternoon', [`Long lunch with local specialties`, `Food tour continuation + dessert stop`]);
  if (experiences.includes('Shopping')) add('afternoon', [`Shopping circuit: artisan streets + curated stops`, `Souvenir hunt + café reset`]);
  if (experiences.includes('Nature & Wildlife')) add('afternoon', [`Scenic afternoon excursion (coast/green space)`, `Wildlife/eco outing with relaxed pace`]);
  if (experiences.includes('Culture & History')) add('afternoon', [`Neighborhood deep-dive (stories + small venues)`, `Historic district + local craft vibe`]);
  if (experiences.includes('Local Hidden Gems')) add('afternoon', [`Hidden-gem detour (less crowded)`, `Local favorite viewpoint or café`]);
  if (experiences.includes('Adventure & Extreme Sports')) add('afternoon', [`Second activity block (still within energy), then recharge`, `Adventure + recovery: water + shade strategy`]);
  if (experiences.includes('Beach & Relaxation')) add('afternoon', [`Beach + optional watersport window`, `Pool/shore recovery + easy transport home`]);
  if (experiences.includes('Luxury & Fine Dining')) add('afternoon', [`Chef-led tasting menu prep day + premium lounge time`, `Upscale shopping + a refined late lunch`]);
  if (experiences.includes('Spiritual & Wellness')) add('afternoon', [`Spa hour or wellness class slot`, `Slow afternoon: journaling walk + calm tea break`]);

  // Evening
  if (experiences.includes('Nightlife & Entertainment')) add('evening', [`Dinner + live music/night market vibe`, `Cocktails or street entertainment route`]);
  if (experiences.includes('Food & Culinary Tours')) add('evening', [`Signature dinner: comfort + local flavors`, `Food night: casual bites + dessert`]);
  if (experiences.includes('Culture & History')) add('evening', [`Sunset sights with story-led stops`, `Evening historic ambience (lights on)`]);
  if (experiences.includes('Photography & Sightseeing')) add('evening', [`Night photography + skyline lights loop`, `Evening landmark photography`]);
  if (experiences.includes('Beach & Relaxation')) add('evening', [`Sunset beach walk + relaxed dinner nearby`, `Coastal golden hour + simple seafood (if your taste fits)`]);
  if (experiences.includes('Spiritual & Wellness')) add('evening', [`Gentle evening reset: breathwork or quiet lounge`, `Early night and a peaceful wind-down`]);
  if (experiences.includes('Family-Friendly Activities')) add('evening', [`Easy dinner + early bedtime-friendly activities`, `Low-noise family evening walk`]);
  if (experiences.includes('Festivals & Events')) add('evening', [`Festival evening: shows, lights, and local energy`, `Event night: street performances + crowd strategy`]);
  if (experiences.includes('Honeymoon / Romance' as any)) {
    // (kept for future)
  }

  // Fallbacks
  if (templates.morning.length === 0) add('morning', [`Start with a highlights loop in ${d}`, `Local neighborhood “first taste” morning`]);
  if (templates.afternoon.length === 0) add('afternoon', [`Discover a second area of ${d} with one anchor attraction`, `Local lunch + relaxed sightseeing`]);
  if (templates.evening.length === 0) add('evening', [`Enjoy an easy, scenic evening: dinner + stroll`, `End the day with a calm view and local snacks`]);

  // Trip type tweaks
  if (tripType === 'Business Trip') {
    templates.morning.unshift(`Efficient start: sights near your base in ${d}`);
    templates.afternoon.unshift(`Quick “win” activity block (low transit, high payoff)`);
  }
  if (tripType === 'Honeymoon / Romance') {
    templates.evening.unshift(`Romantic evening: cozy dinner + sunset spot`);
  }
  if (tripType === 'Wellness & Retreat') {
    templates.morning.unshift('Breathwork + calm stretch session');
    templates.evening.unshift('Unhurried wind-down: spa-like self-care plan');
  }

  return templates;
}

function computeBudgetBreakdown(totalBudget: number, tripType: TripType, experiences: ExperienceType[]) {
  let weights = {
    Accommodation: 0.3,
    Food: 0.2,
    Transport: 0.15,
    Activities: 0.25,
    Miscellaneous: 0.1,
  };

  if (tripType === 'Business Trip') {
    weights.Accommodation += 0.04;
    weights.Transport += 0.02;
    weights.Activities -= 0.02;
  }
  if (tripType === 'Honeymoon / Romance') {
    weights.Accommodation += 0.03;
    weights.Activities += 0.03;
    weights.Miscellaneous -= 0.01;
  }
  if (tripType === 'Family Holiday') {
    weights.Activities += 0.03;
    weights.Food += 0.01;
    weights.Transport -= 0.02;
  }
  if (tripType === 'Wellness & Retreat') {
    weights.Activities += 0.03;
    weights.Miscellaneous += 0.01;
  }
  if (experiences.includes('Luxury & Fine Dining')) {
    weights.Food += 0.06;
    weights.Activities -= 0.03;
  }
  if (experiences.includes('Budget Backpacking')) {
    weights.Accommodation -= 0.05;
    weights.Food -= 0.01;
    weights.Activities += 0.03;
    weights.Miscellaneous += 0.03;
  }
  if (experiences.includes('Beach & Relaxation')) {
    weights.Activities -= 0.02;
    weights.Accommodation += 0.01;
  }
  if (experiences.includes('Adventure & Extreme Sports')) {
    weights.Activities += 0.05;
    weights.Transport += 0.02;
    weights.Miscellaneous -= 0.02;
  }

  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  weights = Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, v / sum])) as typeof weights;

  const safeTotal = Math.max(0, totalBudget || 0);
  const raw = {
    Accommodation: safeTotal * weights.Accommodation,
    Food: safeTotal * weights.Food,
    Transport: safeTotal * weights.Transport,
    Activities: safeTotal * weights.Activities,
    Miscellaneous: safeTotal * weights.Miscellaneous,
  };

  const rounded: typeof raw = {
    Accommodation: Math.round(raw.Accommodation),
    Food: Math.round(raw.Food),
    Transport: Math.round(raw.Transport),
    Activities: Math.round(raw.Activities),
    Miscellaneous: Math.round(raw.Miscellaneous),
  };
  const diff = safeTotal - (rounded.Accommodation + rounded.Food + rounded.Transport + rounded.Activities + rounded.Miscellaneous);
  rounded.Miscellaneous += diff;
  return rounded;
}

function buildPlan(profile: TravelDetails, days: number) {
  const seed = `${profile.trip_type}|${profile.destination}|${profile.departure_date}|${profile.return_date}|${profile.travellers}|${profile.budget_amount}|${profile.currency}|${profile.experiences.join(',')}`;
  const templates = chooseActivityTemplates(profile.experiences, profile.trip_type, profile.destination);
  const topExperiences = makeTopExperiences(profile.experiences, profile.destination, profile.trip_type);
  const budgetBreakdown = computeBudgetBreakdown(profile.budget_amount, profile.trip_type, profile.experiences);
  const tips = practicalTips(profile.destination, profile.departure_date);

  const itinerary = Array.from({ length: days }).map((_, dayIdx) => {
    const dayNum = dayIdx + 1;
    const date = profile.departure_date
      ? new Date(new Date(profile.departure_date + 'T00:00:00').getTime() + dayIdx * 86400000)
      : null;
    const dateLabel = date ? date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : `Day ${dayNum}`;

    const morning = seededPick(templates.morning, seed, dayIdx * 3 + 1);
    const afternoon = seededPick(templates.afternoon, seed, dayIdx * 3 + 2);
    const evening = seededPick(templates.evening, seed, dayIdx * 3 + 3);
    return { dayNum, dateLabel, morning, afternoon, evening };
  });

  return {
    itinerary,
    topExperiences,
    budgetBreakdown,
    practicalTips: tips,
  };
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildDownloadText(profile: TravelDetails, plan: ReturnType<typeof buildPlan>, extraNote?: string) {
  const symbol = CURRENCY_SYMBOLS[profile.currency] || '';
  const lines: string[] = [];
  lines.push(`ROAMIE Travel Profile`);
  lines.push(`Destination: ${profile.destination}`);
  lines.push(`Trip type: ${profile.trip_type}`);
  lines.push(`Dates: ${profile.departure_date} → ${profile.return_date}`);
  lines.push(`Travellers: ${profile.travellers}`);
  lines.push(`Budget: ${symbol || profile.currency}${profile.budget_amount}`);
  lines.push(`Experiences: ${profile.experiences.join(', ')}`);
  lines.push('');
  lines.push('Recommended Itinerary');
  lines.push('');
  for (const day of plan.itinerary) {
    lines.push(`Day ${day.dayNum} (${day.dateLabel})`);
    lines.push(`  Morning: ${day.morning}`);
    lines.push(`  Afternoon: ${day.afternoon}`);
    lines.push(`  Evening: ${day.evening}`);
    lines.push('');
  }
  lines.push('Top Experiences');
  lines.push(plan.topExperiences.map((t) => `- ${t}`).join('\n'));
  lines.push('');
  lines.push('Budget Breakdown');
  lines.push(`- Accommodation: ${formatMoney(plan.budgetBreakdown.Accommodation, profile.currency)}`);
  lines.push(`- Food: ${formatMoney(plan.budgetBreakdown.Food, profile.currency)}`);
  lines.push(`- Transport: ${formatMoney(plan.budgetBreakdown.Transport, profile.currency)}`);
  lines.push(`- Activities: ${formatMoney(plan.budgetBreakdown.Activities, profile.currency)}`);
  lines.push(`- Miscellaneous: ${formatMoney(plan.budgetBreakdown.Miscellaneous, profile.currency)}`);
  lines.push('');
  lines.push('Practical Tips');
  lines.push(`- Best time to visit: ${plan.practicalTips.bestTime}`);
  lines.push(`- Local customs: ${plan.practicalTips.localCustoms}`);
  lines.push(`- Visa guidance: ${plan.practicalTips.visaRequirements}`);
  lines.push(`- Weather notes: ${plan.practicalTips.weatherNotes}`);
  if (extraNote) {
    lines.push('');
    lines.push('Extra Notes');
    lines.push(extraNote);
  }
  return lines.join('\n');
}

export default function TravelChatbotV2({
  onChatComplete,
  className = '',
}: {
  onChatComplete?: (profile: TravelDetails) => void;
  className?: string;
}) {
  const { setRecommendedPlan } = useStore();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'ai', text: "Hey! I'm Roamie. Where are you dreaming of going?" },
  ]);

  const [tripType, setTripType] = useState<TripType | null>(null);

  // Step 2 (Destination) state
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState<string[]>(COUNTRY_LIST.slice(0, 10));
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [destinationConfirmed, setDestinationConfirmed] = useState<string | null>(null);
  const dropdownWrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [departureDate, setDepartureDate] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>('');
  const [travellers, setTravellers] = useState<number>(2);
  const [budgetAmountDraft, setBudgetAmountDraft] = useState<string>('3000');
  const budgetAmount = useMemo(() => {
    const n = Number(String(budgetAmountDraft || '').replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  }, [budgetAmountDraft]);

  const [currencyQuery, setCurrencyQuery] = useState('');
  const [currencyFocused, setCurrencyFocused] = useState(false);
  const currencySuggestions = useMemo(() => {
    const q = currencyQuery.trim().toUpperCase();
    if (!q) return CURRENCY_CHIPS.map((c) => c.code);
    const all = [...CURRENCY_CHIPS.map((c) => c.code), 'CHF', 'SEK', 'NOK', 'ZAR', 'MXN', 'CNY'];
    return all.filter((c) => c.includes(q)).slice(0, 8);
  }, [currencyQuery]);
  const [currency, setCurrency] = useState<CurrencyCode | null>(null);

  const [experiences, setExperiences] = useState<ExperienceType[]>([]);

  const [planDays, setPlanDays] = useState<number>(0);
  const [plan, setPlan] = useState<ReturnType<typeof buildPlan> | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const pushAi = (text: string) => {
    setMessages((p) => [...p, { role: 'ai', text }]);
    setTimeout(scrollToBottom, 0);
  };
  const pushUser = (text: string) => {
    setMessages((p) => [...p, { role: 'user', text }]);
    setTimeout(scrollToBottom, 0);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser doesn't support speech recognition.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      pushUser(text);
      setTyping(true);
      try {
        const { data } = await api.post('/voice', { text });
        const aiResponse = data.response;
        pushAi(aiResponse);
        speak(aiResponse);
      } catch (err) {
        pushAi("I'm sorry, I encountered an error with my voice module.");
      } finally {
        setTyping(false);
      }
    };
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Destination filtering (offline, fast, capped)
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q === '') {
      setFiltered(COUNTRY_LIST.slice(0, 10));
      return;
    }
    const results = COUNTRY_LIST.filter((c) => c.toLowerCase().includes(q));
    setFiltered(results.slice(0, 10));
  }, [query]);

  // Close destination dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const onDown = (e: MouseEvent) => {
      const el = dropdownWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showDropdown]);

  // Smooth scroll the active option into view
  useEffect(() => {
    if (!showDropdown) return;
    if (activeIndex < 0) return;
    const list = listRef.current;
    if (!list) return;
    const child = list.children.item(activeIndex) as HTMLElement | null;
    child?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, showDropdown]);

  const typingBetween = (nextStep: number, nextAiMessage: string, onAdvance?: () => void) => {
    setTyping(true);
    setActionNote(null);
    setTimeout(() => {
      onAdvance?.();
      setTyping(false);
      pushAi(nextAiMessage);
      setStep(nextStep as any);
    }, 520);
  };

  const reset = () => {
    setStep(1);
    setTyping(false);
    setMessages([{ role: 'ai', text: 'Welcome aboard! 🌍 What type of trip are you planning?' }]);
    setTripType(null);
    setQuery('');
    setFiltered(COUNTRY_LIST.slice(0, 10));
    setShowDropdown(false);
    setActiveIndex(-1);
    setDestinationConfirmed(null);
    setDepartureDate('');
    setReturnDate('');
    setTravellers(2);
    setBudgetAmountDraft('3000');
    setCurrencyQuery('');
    setCurrencyFocused(false);
    setCurrency(null);
    setExperiences([]);
    setPlan(null);
    setPlanDays(0);
    setActionNote(null);
  };



  const buildProfile = (): TravelDetails => {
    return {
      trip_type: tripType as TripType,
      destination: destinationConfirmed as string,
      departure_date: departureDate,
      return_date: returnDate,
      travellers,
      budget_amount: budgetAmount,
      currency: currency as CurrencyCode,
      experiences,
    };
  };

  const btnChip = (active: boolean) => ({
    minHeight: 44,
    borderRadius: 12,
    padding: '10px 12px',
    border: active ? '1.5px solid #e55803' : '1.5px solid #f0dfc0',
    background: active ? '#fde8d8' : '#fff',
    color: '#0e2125',
    fontSize: 13,
    fontWeight: 700 as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    cursor: 'pointer',
    userSelect: 'none' as const,
    width: '100%',
  });

  const rInput = {
    background: '#ffffff',
    border: '1.5px solid #f0dfc0',
    borderRadius: 12,
    padding: '10px 14px',
    fontFamily: 'DM Sans,sans-serif',
    fontSize: 14,
    color: '#0e2125',
    outline: 'none',
    minHeight: 44,
    width: '100%',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  } as const;





  const showPlan = step === 6 && plan;

  const handleFinish = () => {
    const profile = buildProfile();
    const days = Math.min(12, Math.max(1, daysBetweenInclusive(profile.departure_date, profile.return_date) || 1));
    const computed = buildPlan(profile, days);
    setPlanDays(days);
    setPlan(computed);
    setRecommendedPlan(computed);
    pushAi('Done! Here’s your personalized plan. ✨');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      onChatComplete?.(profile);
      setStep(6);
    }, 520);
  };

  const generateHotelsInBudget = () => {
    const d = destinationConfirmed || '';
    const vibe = tripType ? getTripVibe(tripType) : 'easy';
    const budgetBand = budgetAmount < 1000 ? 'value' : budgetAmount < 3000 ? 'mid' : 'premium';
    const lines: string[] = [];
    lines.push(`Hotels for a ${budgetBand}-friendly stay in ${d}:`);
    if (d.toLowerCase().includes('paris') || d.toLowerCase().includes('rome') || d.toLowerCase().includes('tokyo')) {
      lines.push('- Pick a neighborhood near major transit to reduce time (and energy).');
      lines.push('- Look for boutiques with breakfast included to offset dining costs.');
    } else if (d.toLowerCase().includes('bali') || d.toLowerCase().includes('maldives') || d.toLowerCase().includes('dubai')) {
      lines.push('- Choose a stay with easy access to beach/water activities (minimize transfers).');
      lines.push('- Prioritize pools/spa amenities if your experiences lean toward wellness.');
    } else {
      lines.push('- Stay central-ish: 10–20 minutes from key areas beats long commutes.');
      lines.push('- Consider flexible check-in/out for smoother day scheduling.');
    }
    lines.push(`(Tip: With a ${vibe} travel vibe, plan one “comfort anchor” per day.)`);
    return lines.join('\n');
  };

  const generateFlights = () => {
    const d = destinationConfirmed || '';
    const day = departureDate ? new Date(departureDate + 'T00:00:00').getMonth() : new Date().getMonth();
    const season = day <= 1 || day === 11 ? 'peak-ish season' : day >= 4 && day <= 8 ? 'popular season' : 'shoulder season';
    const lines = [
      `Flight strategy for ${d}:`,
      `- Since this looks like ${season}, book early for best fare.`,
      '- Aim to arrive by midday if you want to enjoy your first day without rush.',
      '- Choose flexible change options if you’re doing adventure activities.',
    ];
    return lines.join('\n');
  };

  const applyAdjustBudget = (nextBudget: number) => {
    if (!plan || !tripType || !destinationConfirmed || !currency) return;
    const profile = buildProfile();
    profile.budget_amount = nextBudget;
    const days = planDays || 1;
    const p = buildPlan(profile, days);
    setPlan(p);
    setRecommendedPlan(p);
    setActionNote(`Budget adjusted to ${formatMoney(nextBudget, profile.currency)}. Updated breakdown below.`);
  };

  const [budgetAdjustDraft, setBudgetAdjustDraft] = useState<number>(budgetAmount);
  const [showBudgetAdjust, setShowBudgetAdjust] = useState(false);
  const applyBudgetAdjustDraft = () => {
    setShowBudgetAdjust(false);
    applyAdjustBudget(budgetAdjustDraft);
  };

  const [showDestinationEdit, setShowDestinationEdit] = useState(false);
  const [destinationEditValue, setDestinationEditValue] = useState<string>('');
  const destinationEditSuggestions = useMemo(() => {
    const q = destinationEditValue.trim().toLowerCase();
    if (!q) return [];
    return POPULAR_DESTINATIONS.filter((x: string) => x.toLowerCase().includes(q)).slice(0, 8);
  }, [destinationEditValue]);
  const applyDestinationChange = (nextDest: string) => {
    setShowDestinationEdit(false);
    setDestinationConfirmed(nextDest);
    setQuery(nextDest);
    if (!plan || !tripType || !currency) return;
    const profile = buildProfile();
    profile.destination = nextDest;
    const p = buildPlan(profile, planDays || 1);
    setPlan(p);
    setRecommendedPlan(p);
    setActionNote(`Destination updated to ${nextDest}. Recomputed itinerary and tips.`);
  };

  const downloadItinerary = () => {
    if (!plan) return;
    const profile = buildProfile();
    const text = buildDownloadText(profile, plan, actionNote || undefined);
    downloadText(`itinerary-${profile.destination.replace(/\s+/g, '-').toLowerCase()}.txt`, text);
  };

  const toggleExperience = (x: ExperienceType) => {
    setExperiences((prev) => (prev.includes(x) ? prev.filter((v) => v !== x) : [...prev, x]));
  };

  return (
    <div className={`r-card ${className}`.trim()} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
      <button 
        onClick={startListening}
        className="btn btn-ghost btn-sm"
        style={{ 
          position: 'absolute', 
          top: 12, 
          right: 12, 
          zIndex: 10, 
          gap: 6, 
          padding: '6px 10px',
          background: 'rgba(229,88,3,0.1)',
          color: '#e55803',
          border: '1px solid rgba(229,88,3,0.2)'
        }}
        title="Voice AI Assistant"
      >
        <Mic size={14} /> Voice AI
      </button>
      <div
        style={{
          maxHeight: 480,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '4px 2px',
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === 'ai' ? 'bubble-ai' : 'bubble-user'}
            style={{ whiteSpace: 'pre-line', maxWidth: '88%' }}
          >
            {m.text}
          </div>
        ))}

        {typing && (
          <div className="bubble-ai" style={{ width: 90, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}

        {/* Step UI */}
        {!typing && step === 1 && (
          <div style={{ display: 'grid', gap: 10 }} className="grid grid-cols-2">
            {TRIP_TYPE_OPTIONS.map((t) => (
              <button
                type="button"
                key={t}
                style={btnChip(tripType === t)}
                onClick={() => {
                  setTripType(t);
                  pushUser(t);
                  typingBetween(2, 'Where would you like to go?', () => {});
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {!typing && step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div ref={dropdownWrapRef} style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                value={query}
                placeholder="Search destination..."
                className="r-input"
                style={rInput}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowDropdown(true);
                  setActiveIndex(-1);
                  setActionNote(null);
                  setDestinationConfirmed(null);
                }}
                onFocus={() => {
                  setShowDropdown(true);
                  setActiveIndex(-1);
                }}
                onKeyDown={(e) => {
                  if (!showDropdown) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveIndex((idx) => Math.min(idx + 1, filtered.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveIndex((idx) => Math.max(idx - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const picked = activeIndex >= 0 ? filtered[activeIndex] : (filtered[0] || '');
                    if (!picked) return;
                    setQuery(picked);
                    setShowDropdown(false);
                    setDestinationConfirmed(picked);
                    pushUser(picked);
                    typingBetween(3, 'Nice! What are your travel dates, number of travellers, and total budget?');
                  } else if (e.key === 'Escape') {
                    setShowDropdown(false);
                    setActiveIndex(-1);
                  }
                }}
              />

              {showDropdown && (
                <ul
                  ref={listRef}
                  className="travel-dd"
                  style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 240, overflowY: 'auto' }}
                >
                  {filtered.map((country, index) => (
                    <li
                      key={country}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQuery(country);
                        setShowDropdown(false);
                        setActiveIndex(-1);
                        setDestinationConfirmed(country);
                        pushUser(country);
                        typingBetween(3, 'Nice! What are your travel dates, number of travellers, and total budget?');
                      }}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        background: index === activeIndex ? '#fde8d8' : '#fff',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#0e2125',
                        borderBottom: index < filtered.length - 1 ? '1px solid #f5e8ca' : 'none',
                      }}
                    >
                      {country}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#6b5c45', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Popular destinations
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {POPULAR_DESTINATIONS.map((d) => (
                  <button
                    type="button"
                    key={d}
                    style={btnChip(destinationConfirmed === d)}
                    onClick={() => {
                      setDestinationConfirmed(d);
                      setQuery(d);
                      setShowDropdown(false);
                      setActiveIndex(-1);
                      pushUser(d);
                      typingBetween(3, 'Nice! What are your travel dates, number of travellers, and total budget?');
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!typing && step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="r-card" style={{ padding: 14, background: '#fffbf4', border: '1px solid #f0dfc0', borderRadius: 14 }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 14, color: '#0e2125', marginBottom: 8 }}>
                Trip details
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#6b5c45', marginBottom: 6 }}>Departure</label>
                  <input
                    type="date"
                    className="r-input"
                    style={rInput}
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#6b5c45', marginBottom: 6 }}>Return</label>
                  <input
                    type="date"
                    className="r-input"
                    style={rInput}
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#6b5c45' }}>Travellers</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ minWidth: 44, height: 44, borderRadius: 12 }}
                      onClick={() => setTravellers((v) => clamp(v - 1, 1, 99))}
                    >
                      −
                    </button>
                    <div style={{ flex: 1, minHeight: 44, borderRadius: 12, border: '1.5px solid #f0dfc0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0e2125' }}>
                      {travellers >= 10 ? '10+' : travellers}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ minWidth: 44, height: 44, borderRadius: 12 }}
                      onClick={() => setTravellers((v) => clamp(v + 1, 1, 99))}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#6b5c45', marginBottom: 6 }}>
                    Budget amount
                  </label>
                  <input
                    type="number"
                    className="r-input"
                    style={rInput}
                    min={0}
                    value={budgetAmountDraft}
                    onChange={(e) => setBudgetAmountDraft(e.target.value)}
                  />
                  <p style={{ fontSize: 11, color: '#6b5c45', marginTop: 6 }}>Enter the amount only. Currency comes next.</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '14px 18px', minWidth: 160 }}
                  disabled={!departureDate || !returnDate || daysBetweenInclusive(departureDate, returnDate) <= 0 || budgetAmount <= 0}
                  onClick={() => {
                    const nextText = `Dates: ${departureDate} → ${returnDate}\nTravellers: ${travellers >= 10 ? '10+' : travellers}\nBudget: ${budgetAmount}`;
                    pushUser(nextText);
                    typingBetween(4, 'What currency would you like your budget in?');
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {!typing && step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#6b5c45', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Choose a currency
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {CURRENCY_CHIPS.map((c) => (
                  <button key={c.code} type="button" style={btnChip(currency === c.code)} onClick={() => setCurrency(c.code)}>
                    {c.display}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#6b5c45', marginBottom: 6 }}>Other currency</p>
              <input
                className="r-input"
                style={rInput}
                value={currencyQuery}
                placeholder="Type currency code (e.g., CHF, SEK) …"
                onFocus={() => setCurrencyFocused(true)}
                onBlur={() => setTimeout(() => setCurrencyFocused(false), 150)}
                onChange={(e) => {
                  const v = e.target.value;
                  setCurrencyQuery(v);
                  const parsed = parseCurrencyCode(v);
                  if (parsed && parsed.length >= 3) setCurrency(parsed);
                }}
              />
              {currencyFocused && currencySuggestions.length > 0 && (
                <div className="travel-dd">
                  {currencySuggestions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="travel-dd-item"
                      style={{ display: 'flex', alignItems: 'center' }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setCurrency(c);
                        setCurrencyQuery(c);
                        setCurrencyFocused(false);
                      }}
                    >
                      {c} {CURRENCY_SYMBOLS[c] ? `(${CURRENCY_SYMBOLS[c]})` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '14px 18px', minWidth: 180 }}
                disabled={!currency}
                onClick={() => {
                  const label = currency ? `${currency} ${CURRENCY_SYMBOLS[currency] || ''}`.trim() : '';
                  pushUser(label);
                  typingBetween(5, 'What kind of experiences are you looking for on this trip? (Select all that apply)');
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {!typing && step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {EXPERIENCE_OPTIONS.map((x) => (
                <button
                  key={x}
                  type="button"
                  style={btnChip(experiences.includes(x))}
                  onClick={() => toggleExperience(x)}
                >
                  {x}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '14px 18px', minWidth: 180 }}
                disabled={experiences.length === 0}
                onClick={() => {
                  pushUser(experiences.join(', '));
                  setTyping(true);
                  setTimeout(() => {
                    setTyping(false);
                    handleFinish();
                  }, 520);
                }}
              >
                Build My Plan
              </button>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Final response */}
      {showPlan && (
        <div style={{ marginTop: 14 }}>
          <div style={{ border: '1px solid #f0dfc0', borderRadius: 16, background: '#fff', padding: 16, boxShadow: '0 2px 12px rgba(14,33,37,0.06)' }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 18, color: '#0e2125', marginBottom: 6 }}>
              Here&apos;s your travel profile, {tripType ? getTripVibe(tripType) : 'traveler'}!
            </p>

            {/* 1) Trip summary card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ border: '1px solid #f0dfc0', borderRadius: 14, padding: 12, background: '#fffbf4' }}>
                <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b5c45', marginBottom: 6 }}>
                  Destination
                </p>
                <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, color: '#0e2125', fontSize: 16 }}>{destinationConfirmed}</p>
                <p style={{ fontSize: 13, color: '#6b5c45', marginTop: 4 }}>{tripType}</p>
              </div>

              <div style={{ border: '1px solid #f0dfc0', borderRadius: 14, padding: 12, background: '#fffbf4' }}>
                <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b5c45', marginBottom: 6 }}>
                  Dates & Budget
                </p>
                <p style={{ fontSize: 13, color: '#0e2125', fontWeight: 800 }}>
                  {departureDate} → {returnDate}
                </p>
                <p style={{ fontSize: 13, color: '#6b5c45', marginTop: 4 }}>
                  Travellers: {travellers >= 10 ? '10+' : travellers} • Budget: {formatMoney(budgetAmount, currency || 'USD')}
                </p>
              </div>
            </div>

            {/* 2) Recommended itinerary rendering logic has been moved to MyItinerary */}

            {/* 3) Top experiences */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, color: '#0e2125', fontSize: 16, marginBottom: 8 }}>
                Top experiences for your vibe
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {plan?.topExperiences.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 99,
                      background: '#fde8d8',
                      border: '1px solid #f0dfc0',
                      color: '#0e2125',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 4) Budget breakdown */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, color: '#0e2125', fontSize: 16, marginBottom: 8 }}>
                Budget breakdown (estimated)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
                {(
                  [
                    { key: 'Accommodation', val: plan?.budgetBreakdown.Accommodation || 0, color: '#6366f1' },
                    { key: 'Food', val: plan?.budgetBreakdown.Food || 0, color: '#22c55e' },
                    { key: 'Transport', val: plan?.budgetBreakdown.Transport || 0, color: '#f59e0b' },
                    { key: 'Activities', val: plan?.budgetBreakdown.Activities || 0, color: '#e55803' },
                    { key: 'Miscellaneous', val: plan?.budgetBreakdown.Miscellaneous || 0, color: '#a855f7' },
                  ] as const
                ).map((c) => (
                  <div key={c.key} style={{ borderRadius: 12, padding: 12, border: '1px solid #f0dfc0', background: '#fffbf4' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 99, background: c.color }} />
                      <p style={{ fontSize: 11, fontWeight: 900, color: '#6b5c45', margin: 0 }}>{c.key}</p>
                    </div>
                    <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 14, color: '#0e2125', margin: 0 }}>
                      {formatMoney(c.val, currency || 'USD')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 5) Practical tips */}
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, color: '#0e2125', fontSize: 16, marginBottom: 8 }}>
                Practical tips
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ borderRadius: 14, padding: 12, border: '1px solid #f0dfc0', background: '#fff6e0' }}>
                  <p style={{ fontSize: 12, fontWeight: 900, color: '#6b5c45', marginBottom: 6 }}>Best time to visit</p>
                  <p style={{ fontSize: 13, color: '#0e2125', fontWeight: 600, lineHeight: 1.4 }}>{plan?.practicalTips.bestTime}</p>
                </div>
                <div style={{ borderRadius: 14, padding: 12, border: '1px solid #f0dfc0', background: '#fff6e0' }}>
                  <p style={{ fontSize: 12, fontWeight: 900, color: '#6b5c45', marginBottom: 6 }}>Local customs</p>
                  <p style={{ fontSize: 13, color: '#0e2125', fontWeight: 600, lineHeight: 1.4 }}>{plan?.practicalTips.localCustoms}</p>
                </div>
                <div style={{ borderRadius: 14, padding: 12, border: '1px solid #f0dfc0', background: '#fff6e0' }}>
                  <p style={{ fontSize: 12, fontWeight: 900, color: '#6b5c45', marginBottom: 6 }}>Visa requirements</p>
                  <p style={{ fontSize: 13, color: '#0e2125', fontWeight: 600, lineHeight: 1.4 }}>{plan?.practicalTips.visaRequirements}</p>
                </div>
                <div style={{ borderRadius: 14, padding: 12, border: '1px solid #f0dfc0', background: '#fff6e0' }}>
                  <p style={{ fontSize: 12, fontWeight: 900, color: '#6b5c45', marginBottom: 6 }}>Weather notes</p>
                  <p style={{ fontSize: 13, color: '#0e2125', fontWeight: 600, lineHeight: 1.4 }}>{plan?.practicalTips.weatherNotes}</p>
                </div>
              </div>
            </div>

            <p style={{ fontWeight: 900, color: '#e55803', fontSize: 16, marginTop: 10 }}>
              Ready to build your full itinerary? Let&apos;s go! 🚀
            </p>
          </div>

          {/* Quick action chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: 999, padding: '12px 16px', background: '#fde8d8' }}
              onClick={() => {
                pushUser('Show me hotels in budget');
                setActionNote(generateHotelsInBudget());
              }}
            >
              Show me hotels in budget
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: 999, padding: '12px 16px', background: '#fde8d8' }}
              onClick={() => {
                pushUser('Find flights');
                setActionNote(generateFlights());
              }}
            >
              Find flights
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: 999, padding: '12px 16px', background: '#fde8d8' }}
              onClick={() => {
                pushUser('Add more days');
                if (!plan) return;
                const next = clamp(planDays + 2, 1, 14);
                const profile = buildProfile();
                setPlanDays(next);
                const p = buildPlan(profile, next);
                setPlan(p);
                setRecommendedPlan(p);
                setActionNote('Added 2 more days. Updated itinerary highlights below.');
              }}
            >
              Add more days
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: 999, padding: '12px 16px', background: '#fde8d8' }}
              onClick={() => {
                pushUser('Adjust budget');
                setShowBudgetAdjust(true);
                setBudgetAdjustDraft(budgetAmount);
                setActionNote(null);
              }}
            >
              Adjust budget
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: 999, padding: '12px 16px', background: '#fde8d8' }}
              onClick={() => {
                pushUser('Change destination');
                setShowDestinationEdit(true);
                setDestinationEditValue(destinationConfirmed || '');
                setActionNote(null);
              }}
            >
              Change destination
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: 999, padding: '12px 16px', background: '#fde8d8' }}
              onClick={() => {
                pushUser('Download itinerary');
                downloadItinerary();
                setActionNote('Downloaded itinerary as a text file.');
              }}
            >
              Download itinerary
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: 999, padding: '12px 16px', background: '#fde8d8' }}
              onClick={() => {
                pushUser('Start over');
                reset();
              }}
            >
              Start over
            </button>
          </div>

          {/* Extra action panel */}
          {(actionNote || showBudgetAdjust || showDestinationEdit) && (
            <div style={{ marginTop: 12 }}>
              {actionNote && (
                <div style={{ border: '1px solid #f0dfc0', background: '#fffbf4', borderRadius: 16, padding: 14, whiteSpace: 'pre-line' }}>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, color: '#0e2125', fontSize: 14, marginBottom: 8 }}>
                    Follow-up
                  </p>
                  <div style={{ color: '#0e2125', fontWeight: 600, lineHeight: 1.45 }}>{actionNote}</div>
                </div>
              )}

              {showBudgetAdjust && (
                <div style={{ border: '1px solid #f0dfc0', background: '#fff', borderRadius: 16, padding: 14, marginTop: 12 }}>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, color: '#0e2125', fontSize: 14, marginBottom: 8 }}>
                    Adjust budget
                  </p>
                  <input
                    type="number"
                    className="r-input"
                    style={rInput}
                    value={budgetAdjustDraft}
                    onChange={(e) => setBudgetAdjustDraft(Number(e.target.value))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowBudgetAdjust(false)}>
                      Cancel
                    </button>
                    <button type="button" className="btn btn-primary" onClick={applyBudgetAdjustDraft} disabled={budgetAdjustDraft <= 0}>
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {showDestinationEdit && (
                <div style={{ border: '1px solid #f0dfc0', background: '#fff', borderRadius: 16, padding: 14, marginTop: 12 }}>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, color: '#0e2125', fontSize: 14, marginBottom: 8 }}>
                    Change destination
                  </p>
                  <input
                    className="r-input"
                    style={rInput}
                    value={destinationEditValue}
                    placeholder="Type a new destination…"
                    onChange={(e) => setDestinationEditValue(e.target.value)}
                    onFocus={() => {}}
                  />

                  {destinationEditSuggestions.length > 0 && (
                    <div className="travel-dd">
                      {destinationEditSuggestions.map((d: string) => (
                        <button
                          type="button"
                          key={d}
                          className="travel-dd-item"
                          style={{ display: 'flex', alignItems: 'center' }}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyDestinationChange(d)}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowDestinationEdit(false)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        const next = (destinationEditValue || '').trim();
                        if (!next) return;
                        applyDestinationChange(next);
                      }}
                      disabled={(destinationEditValue || '').trim().length < 2}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

