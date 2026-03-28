import { IItineraryService } from '../../domain/interfaces';
import { TripContext, ItineraryPlan, ItineraryEvent, FreeGap } from '../../domain/entities';
import fallbackData from '../../data/fallbackItineraries.json';
import { MockPlacesService } from './MockPlacesService';

export class OllamaItineraryService implements IItineraryService {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
  }

  private buildContextPrompt(ctx: TripContext): string {
    const parts = [
      `You are a travel itinerary planner. Create a detailed day-by-day itinerary.`,
      `Destination: ${ctx.destination}`,
      `Dates: ${ctx.startDate} to ${ctx.endDate}`,
      `Trip purpose: ${ctx.tripPurpose}`,
    ];
    if (ctx.energyLevel) parts.push(`Energy level: ${ctx.energyLevel}`);
    if (ctx.timeOfDay) parts.push(`Time of day preference: ${ctx.timeOfDay}`);
    if (ctx.dietaryPref) parts.push(`Dietary preferences: ${ctx.dietaryPref}`);
    if (ctx.savedPlaces?.length) parts.push(`Must-visit places: ${ctx.savedPlaces.join(', ')}`);
    if (ctx.calendarEvents?.length) {
      parts.push(`Fixed calendar events (do not overlap):`);
      ctx.calendarEvents.forEach(e => parts.push(`  - ${e.title}: ${e.start} to ${e.end}`));
    }
    if (ctx.weather?.daily?.length) {
      parts.push(`Weather forecast:`);
      ctx.weather.daily.forEach(d => parts.push(`  ${d.date}: ${d.description}, ${d.tempMin}-${d.tempMax}°C, ${d.precipitationProbability}% rain`));
    }
    parts.push(`Language: Respond entirely in ${ctx.lang === 'en' ? 'English' : ctx.lang}. Do not use English if another language is selected.`);
    parts.push(`Return a valid JSON object with this structure:
{
  "days": [{ "date": "YYYY-MM-DD", "events": [{ "time": "HH:MM", "duration_minutes": N, "type": "activity|food|transport|break|meeting|sightseeing|shopping", "title": "...", "description": "...", "location": "...", "isGapSuggestion": false, "isBreathingRoom": false }], "freeGaps": [{ "start": "HH:MM", "end": "HH:MM", "durationMinutes": N }] }],
  "documentChecklist": ["..."],
  "culturalNudges": ["..."]
}
Return ONLY valid JSON, no markdown, no explanation.`);
    return parts.join('\n');
  }

  async generateItinerary(context: TripContext): Promise<ItineraryPlan> {
    try {
      const prompt = this.buildContextPrompt(context);
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt, stream: false, format: 'json' }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      const data: any = await response.json();
      const text = data.response || '';
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Ollama returned malformed JSON');
      }

      // Apply breathing room optimizer
      if (parsed.days) {
        parsed.days = parsed.days.map((day: any) => ({
          ...day,
          events: this.applyBreathingRoom(day.events || []),
          freeGaps: this.detectGaps(day.events || []),
        }));
      }

      return parsed as ItineraryPlan;
    } catch (error) {
      console.warn('Ollama unavailable, using fallback itinerary:', (error as Error).message);
      return await this.getFallbackItinerary(context);
    }
  }

  private applyBreathingRoom(events: ItineraryEvent[]): ItineraryEvent[] {
    const activityEvents = events.filter(e => e.type !== 'break' && e.type !== 'transport');
    const totalMins = activityEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

    if (totalMins > 480 || activityEvents.length > 5) {
      let maxGapIdx = 0;
      let maxGap = 0;
      for (let i = 0; i < events.length - 1; i++) {
        const endMins = this.timeToMinutes(events[i].time) + (events[i].duration_minutes || 0);
        const nextStart = this.timeToMinutes(events[i + 1].time);
        const gap = nextStart - endMins;
        if (gap > maxGap) { maxGap = gap; maxGapIdx = i + 1; }
      }

      const hasBreak = events.some(e => e.isBreathingRoom);
      if (!hasBreak && maxGapIdx > 0) {
        const breakTime = this.minutesToTime(
          this.timeToMinutes(events[maxGapIdx - 1].time) + (events[maxGapIdx - 1].duration_minutes || 0) + 5
        );
        const breakEvent: ItineraryEvent = {
          time: breakTime,
          duration_minutes: 30,
          type: 'break',
          title: 'Breathing Room',
          description: 'Take a moment to relax. Grab a coffee, sit in a park, or just breathe.',
          location: events[maxGapIdx - 1]?.location || 'Nearby',
          isGapSuggestion: false,
          isBreathingRoom: true,
        };
        events.splice(maxGapIdx, 0, breakEvent);
      }
    }
    return events;
  }

  private detectGaps(events: ItineraryEvent[]): FreeGap[] {
    const gaps: FreeGap[] = [];
    for (let i = 0; i < events.length - 1; i++) {
      const endMins = this.timeToMinutes(events[i].time) + (events[i].duration_minutes || 0);
      const nextStart = this.timeToMinutes(events[i + 1].time);
      const gapMins = nextStart - endMins;
      if (gapMins >= 30 && gapMins <= 90) {
        gaps.push({
          start: this.minutesToTime(endMins),
          end: this.minutesToTime(nextStart),
          durationMinutes: gapMins,
        });
      }
    }
    return gaps;
  }

  private timeToMinutes(t: string): number {
    const [h, m] = (t || '09:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private minutesToTime(m: number): string {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  private async getFallbackItinerary(ctx: TripContext): Promise<ItineraryPlan> {
    const dest = ctx.destination.toLowerCase();
    const fallbacks = fallbackData as Record<string, any>;
    const cityData = fallbacks[dest];

    if (!cityData) {
      return await this.generateGenericItinerary(ctx);
    }

    const start = new Date(ctx.startDate);
    const end = new Date(ctx.endDate);
    const numDays = Math.max(1, Math.min(7, Math.ceil((end.getTime() - start.getTime()) / 86400000)));

    const days = [];
    for (let i = 0; i < numDays; i++) {
      const dayDate = new Date(start);
      dayDate.setDate(dayDate.getDate() + i);
      const dayKey = `day${i + 1}`;
      const dayData = cityData.days?.[dayKey] || cityData.days?.day1;

      if (dayData) {
        const events = this.applyBreathingRoom(dayData.events || []);
        days.push({
          date: dayDate.toISOString().split('T')[0],
          events,
          freeGaps: this.detectGaps(events),
        });
      }
    }

    return {
      days,
      documentChecklist: cityData.documentChecklist || ['Passport', 'Visa (if required)', 'Travel insurance', 'Hotel confirmations'],
      culturalNudges: cityData.culturalNudges || ['Respect local customs', 'Learn a few phrases in the local language'],
    };
  }

  private placesService = new MockPlacesService();

  private async fetchNominatimPOIs(destination: string): Promise<{ name: string; category: string; description: string; location: string }[]> {
    try {
      const queries = [
        `${destination} tourist attraction`,
        `${destination} landmark`,
        `${destination} restaurant`,
        `${destination} park`,
        `${destination} museum`,
      ];

      const allResults: { name: string; category: string; description: string; location: string }[] = [];
      const seenNames = new Set<string>();

      for (const q of queries) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=4&addressdetails=1&accept-language=en`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Roamie/1.0 (travel-planner)' },
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) continue;
          const data: any[] = await res.json() as any[];

          for (const d of data) {
            const name = d.name || d.display_name?.split(',')[0] || '';
            if (!name || seenNames.has(name.toLowerCase())) continue;
            seenNames.add(name.toLowerCase());

            let category = 'sightseeing';
            const type = (d.type || d.class || '').toLowerCase();
            if (/restaurant|cafe|food|bar/i.test(type)) category = 'food';
            else if (/park|garden|nature/i.test(type)) category = 'activity';
            else if (/museum|gallery/i.test(type)) category = 'sightseeing';
            else if (/shop|market|mall/i.test(type)) category = 'shopping';

            allResults.push({
              name,
              category,
              description: d.display_name || `Visit ${name} in ${destination}`,
              location: d.display_name?.split(',').slice(0, 2).join(',').trim() || destination,
            });
          }
          await new Promise(r => setTimeout(r, 200));
        } catch {
          // Continue with next query
        }
      }
      return allResults;
    } catch {
      return [];
    }
  }

  private async generateGenericItinerary(ctx: TripContext): Promise<ItineraryPlan> {
    const start = new Date(ctx.startDate);
    const end = new Date(ctx.endDate);
    const numDays = Math.max(1, Math.min(14, Math.ceil((end.getTime() - start.getTime()) / 86400000)));
    const isBusiness = ctx.tripPurpose === 'business';
    const energy = ctx.energyLevel || 'medium';

    // Try to find real places from places.json first
    const knownPlaces = this.placesService.findByCity(ctx.destination);
    let realPOIs: { name: string; category: string; description: string; location: string }[] = [];

    if (knownPlaces.length > 0) {
      realPOIs = knownPlaces.map(p => ({
        name: p.name,
        category: p.category === 'landmark' ? 'sightseeing' : p.category,
        description: p.culturalNudge || `Visit ${p.name} at ${p.address}`,
        location: `${p.name}, ${p.address}`,
      }));
    } else {
      realPOIs = await this.fetchNominatimPOIs(ctx.destination);
    }

    // Separate POIs by category for smart distribution
    const sightseeing = realPOIs.filter(p => ['sightseeing', 'landmark'].includes(p.category));
    const foods = realPOIs.filter(p => p.category === 'food');
    const allAttractions = [...sightseeing, ...realPOIs.filter(p => !['food', 'sightseeing', 'landmark'].includes(p.category))];

    const sIdx = { v: 0 }, fIdx = { v: 0 }, aIdx = { v: 0 };
    const getNext = (pool: typeof realPOIs, idx: { v: number }) => {
      if (pool.length === 0) return null;
      const p = pool[idx.v % pool.length];
      idx.v++;
      return p;
    };

    // Day themes for variation across the trip
    const dayThemes = ['explorer', 'foodie', 'culture', 'adventure', 'relaxed', 'shopper', 'discovery'];

    const days = [];
    for (let i = 0; i < numDays; i++) {
      const dayDate = new Date(start);
      dayDate.setDate(dayDate.getDate() + i);
      const isFirstDay = i === 0;
      const theme = dayThemes[i % dayThemes.length];

      const events: ItineraryEvent[] = [];

      if (isBusiness) {
        const bf = getNext(foods, fIdx);
        const lunch = getNext(foods, fIdx);
        const dinner = getNext(foods, fIdx);
        const explore = getNext(allAttractions, aIdx);

        events.push(
          { time: isFirstDay ? '09:00' : '08:00', duration_minutes: 60, type: 'food', title: bf ? `Breakfast at ${bf.name}` : 'Hotel Breakfast', description: bf?.description || 'Start with a full breakfast.', location: bf?.location || 'Hotel Restaurant', isGapSuggestion: false, isBreathingRoom: false },
          { time: '09:30', duration_minutes: 180, type: 'meeting', title: 'Client Meeting', description: 'Scheduled meeting with the local team.', location: 'Business Center', isGapSuggestion: false, isBreathingRoom: false },
          { time: '12:30', duration_minutes: 60, type: 'food', title: lunch ? `Working Lunch at ${lunch.name}` : 'Working Lunch', description: lunch?.description || 'Quick lunch between sessions.', location: lunch?.location || 'Local Restaurant', isGapSuggestion: false, isBreathingRoom: false },
          { time: '14:00', duration_minutes: 120, type: 'meeting', title: 'Afternoon Session', description: 'Follow-up meeting and planning.', location: 'Business Center', isGapSuggestion: false, isBreathingRoom: false },
          { time: '16:30', duration_minutes: 30, type: 'break', title: 'Breathing Room ☕', description: 'Decompress and recharge.', location: 'Nearby Café', isGapSuggestion: false, isBreathingRoom: true },
          { time: '17:30', duration_minutes: 90, type: 'activity', title: explore ? `Explore ${explore.name}` : `Explore ${ctx.destination}`, description: explore?.description || `Free time in ${ctx.destination}.`, location: explore?.location || ctx.destination, isGapSuggestion: true, isBreathingRoom: false },
          { time: '19:30', duration_minutes: 90, type: 'food', title: dinner ? `Dinner at ${dinner.name}` : 'Dinner', description: dinner?.description || 'Enjoy local cuisine.', location: dinner?.location || 'Local Restaurant', isGapSuggestion: false, isBreathingRoom: false },
        );
      } else {
        // Leisure: energy-aware + day-theme variation
        const bf = getNext(foods, fIdx);
        const lunch = getNext(foods, fIdx);
        const dinner = getNext(foods, fIdx);
        const morning1 = getNext(sightseeing.length > 0 ? sightseeing : allAttractions, sIdx);
        const afternoon1 = getNext(allAttractions, aIdx);
        const evening1 = getNext(sightseeing.length > 0 ? sightseeing : allAttractions, sIdx);
        const extra1 = getNext(allAttractions, aIdx);
        const snack = getNext(foods, fIdx);

        // Breakfast — later start on relaxed/low-energy days
        const bfTime = isFirstDay ? '09:00' : (energy === 'low' || theme === 'relaxed') ? '09:30' : '08:30';
        events.push({
          time: bfTime, duration_minutes: 60, type: 'food',
          title: bf ? `Breakfast at ${bf.name}` : 'Morning Breakfast',
          description: bf?.description || `Start with a local breakfast in ${ctx.destination}.`,
          location: bf?.location || 'Local Café',
          isGapSuggestion: false, isBreathingRoom: false,
        });

        // Morning activity — outdoor sightseeing in best light
        const morningStart = isFirstDay ? '10:30' : (energy === 'low' ? '11:00' : '10:00');
        const morningDuration = energy === 'high' ? 150 : energy === 'low' ? 90 : 120;
        events.push({
          time: morningStart, duration_minutes: morningDuration,
          type: theme === 'foodie' ? 'activity' : 'sightseeing',
          title: morning1?.name || `Morning ${theme === 'foodie' ? 'Food Tour' : 'Exploration'}`,
          description: morning1?.description || `Explore the highlights of ${ctx.destination}.`,
          location: morning1?.location || ctx.destination,
          isGapSuggestion: false, isBreathingRoom: false,
        });

        // Lunch
        events.push({
          time: '12:30', duration_minutes: energy === 'low' ? 90 : 75, type: 'food',
          title: lunch ? `Lunch at ${lunch.name}` : 'Local Lunch',
          description: lunch?.description || 'Refuel with local flavors.',
          location: lunch?.location || 'Local Eatery',
          isGapSuggestion: false, isBreathingRoom: false,
        });

        // Afternoon activity — indoor (museums, galleries, shopping)
        const pmType = theme === 'shopper' ? 'shopping' : theme === 'culture' ? 'sightseeing' : 'activity';
        events.push({
          time: '14:30', duration_minutes: energy === 'high' ? 150 : energy === 'low' ? 90 : 120,
          type: pmType,
          title: afternoon1?.name || `Afternoon ${theme === 'culture' ? 'Culture' : 'Adventure'}`,
          description: afternoon1?.description || `Discover hidden gems in ${ctx.destination}.`,
          location: afternoon1?.location || ctx.destination,
          isGapSuggestion: false, isBreathingRoom: false,
        });

        // Breathing room
        events.push({
          time: energy === 'high' ? '17:00' : '16:30', duration_minutes: 30, type: 'break',
          title: 'Breathing Room ☕',
          description: theme === 'relaxed'
            ? 'Take it easy — people-watch or grab a drink.'
            : 'Recharge before the evening.',
          location: 'Nearby Café',
          isGapSuggestion: false, isBreathingRoom: true,
        });

        // Bonus activity for high-energy days
        if (energy === 'high') {
          events.push({
            time: '17:30', duration_minutes: 60, type: 'activity',
            title: extra1?.name || `Bonus: Local Discovery`,
            description: extra1?.description || `Extra exploration — you've got the energy!`,
            location: extra1?.location || ctx.destination,
            isGapSuggestion: true, isBreathingRoom: false,
          });
        }

        // Evening sightseeing — golden hour
        events.push({
          time: energy === 'high' ? '19:00' : '18:00',
          duration_minutes: energy === 'low' ? 60 : 90,
          type: 'sightseeing',
          title: evening1?.name || 'Golden Hour Stroll',
          description: evening1?.description || `Sunset vibes in ${ctx.destination}.`,
          location: evening1?.location || ctx.destination,
          isGapSuggestion: false, isBreathingRoom: false,
        });

        // Extra snack on foodie days
        if (theme === 'foodie' && snack) {
          events.splice(4, 0, {
            time: '16:00', duration_minutes: 45, type: 'food',
            title: `Snack at ${snack.name}`,
            description: snack.description || 'Treat yourself to a local delicacy.',
            location: snack.location || ctx.destination,
            isGapSuggestion: true, isBreathingRoom: false,
          });
        }

        // Dinner
        events.push({
          time: energy === 'high' ? '21:00' : '20:00', duration_minutes: 90, type: 'food',
          title: dinner ? `Dinner at ${dinner.name}` : 'Dinner',
          description: dinner?.description || `End the day with a memorable meal.`,
          location: dinner?.location || 'Restaurant',
          isGapSuggestion: false, isBreathingRoom: false,
        });
      }

      days.push({
        date: dayDate.toISOString().split('T')[0],
        events,
        freeGaps: this.detectGaps(events),
      });
    }

    return {
      days,
      documentChecklist: [
        'Valid passport (6+ months validity)',
        'Visa if required',
        'Travel insurance documents',
        'Hotel booking confirmations',
        'Return flight tickets',
        'Local currency or travel card',
      ],
      culturalNudges: [
        'Research local tipping customs',
        'Learn basic greetings in the local language',
        'Check dress code requirements for religious sites',
        `Download an offline map of ${ctx.destination}`,
      ],
    };
  }
}
