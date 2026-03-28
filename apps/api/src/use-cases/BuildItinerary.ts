import { ITripRepository, IItineraryService } from '../domain/interfaces';
import { ItineraryPlan, TripContext } from '../domain/entities';
import { WeatherService } from '../adapters/services/WeatherService';
import { GeocodingService } from '../adapters/services/GeocodingService';

export class BuildItinerary {
  constructor(
    private tripRepo: ITripRepository,
    private itineraryService: IItineraryService,
  ) {}

  private weatherService = new WeatherService();
  private geocoding = new GeocodingService();

  async execute(params: {
    tripId: string;
    savedPlaces?: string[];
    calendarEvents?: { title: string; start: string; end: string; location?: string }[];
    energyLevel?: 'high' | 'medium' | 'low';
    lang?: string;
  }): Promise<ItineraryPlan> {
    const trip = await this.tripRepo.findTripById(params.tripId);
    if (!trip) throw new Error('Trip not found');

    const user = await this.tripRepo.findUserById(trip.userId);
    if (!user) throw new Error('User not found');

    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    const context: TripContext = {
      destination: trip.destination,
      startDate: trip.startDate.toISOString().split('T')[0],
      endDate: trip.endDate.toISOString().split('T')[0],
      tripPurpose: user.tripPurpose,
      savedPlaces: params.savedPlaces || [],
      calendarEvents: params.calendarEvents || [],
      dietaryPref: user.dietaryPref,
      lang: params.lang || user.preferredLang || 'en',
      energyLevel: params.energyLevel,
      timeOfDay,
    };

    // Enrich context with weather forecast
    try {
      const coords = await this.geocoding.getCoords(context.destination);
      if (coords) {
        const start = new Date(context.startDate);
        const end = new Date(context.endDate);
        const numDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000)) + 1;
        context.weather = await this.weatherService.getForecast(coords.lat, coords.lng, Math.min(numDays, 7));
      }
    } catch (e) {
      console.warn('Weather fetch failed, continuing without weather data:', (e as Error).message);
    }

    const plan = await this.itineraryService.generateItinerary(context);

    // Post-process: add arrival/departure + travel segments
    this.enrichPlanWithTravelEvents(plan, context);

    // Save itinerary days to database
    for (const day of plan.days) {
      await this.tripRepo.upsertItineraryDay({
        tripId: params.tripId,
        date: new Date(day.date),
        events: JSON.stringify(day.events),
        freeGaps: JSON.stringify(day.freeGaps || []),
      });
    }

    return plan;
  }

  /**
   * Enriches the plan with arrival event on Day 1, departure on last day,
   * and transport segments between activities at different locations.
   */
  private enrichPlanWithTravelEvents(plan: ItineraryPlan, ctx: TripContext): void {
    if (!plan.days || plan.days.length === 0) return;

    // Day 1: prepend arrival event if not already present
    const firstDay = plan.days[0];
    const hasArrival = firstDay.events?.some((e: any) =>
      e.title?.toLowerCase().includes('arrive') || e.title?.toLowerCase().includes('arrival')
    );
    if (!hasArrival && firstDay.events) {
      firstDay.events.unshift({
        time: '07:00',
        duration_minutes: 60,
        type: 'transport',
        title: `Arrive in ${ctx.destination}`,
        description: `Welcome to ${ctx.destination}! Settle into your accommodation and get oriented with the local area.`,
        location: `${ctx.destination} Airport / Station`,
        isGapSuggestion: false,
        isBreathingRoom: false,
      });
    }

    // Last day: append departure event if not already present
    const lastDay = plan.days[plan.days.length - 1];
    const hasDeparture = lastDay.events?.some((e: any) =>
      e.title?.toLowerCase().includes('depart') || e.title?.toLowerCase().includes('departure') || e.title?.toLowerCase().includes('return')
    );
    if (!hasDeparture && lastDay.events) {
      lastDay.events.push({
        time: '21:00',
        duration_minutes: 60,
        type: 'transport',
        title: `Depart from ${ctx.destination}`,
        description: `Head to the airport/station for your journey home. Safe travels!`,
        location: `${ctx.destination} Airport / Station`,
        isGapSuggestion: false,
        isBreathingRoom: false,
      });
    }

    // Insert transport segments between activities at different locations
    for (const day of plan.days) {
      if (!day.events || day.events.length < 2) continue;
      const enriched: any[] = [];
      for (let i = 0; i < day.events.length; i++) {
        enriched.push(day.events[i]);
        if (i < day.events.length - 1) {
          const curr = day.events[i];
          const next = day.events[i + 1];
          // Skip if next event is already transport or break
          if (next.type === 'transport' || next.type === 'break') continue;
          if (curr.type === 'transport') continue;
          // Only insert if locations differ
          const currLoc = (curr.location || '').toLowerCase().trim();
          const nextLoc = (next.location || '').toLowerCase().trim();
          if (currLoc && nextLoc && currLoc !== nextLoc) {
            // Calculate travel time slot
            const currEndMins = this.timeToMinutes(curr.time) + (curr.duration_minutes || 0);
            const nextStartMins = this.timeToMinutes(next.time);
            const gap = nextStartMins - currEndMins;
            if (gap >= 20) {
              enriched.push({
                time: this.minutesToTime(currEndMins + 5),
                duration_minutes: Math.min(gap - 10, 25),
                type: 'transport',
                title: `Travel to next location`,
                description: `Head from ${curr.location?.split(',')[0] || 'current spot'} to ${next.location?.split(',')[0] || 'next destination'}`,
                location: `In transit`,
                isGapSuggestion: true,
                isBreathingRoom: false,
              });
            }
          }
        }
      }
      day.events = enriched;
    }
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
}
