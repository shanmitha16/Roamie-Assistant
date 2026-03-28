import { IItineraryService } from '../../domain/interfaces';
import { TripContext, ItineraryPlan, ItineraryEvent, FreeGap } from '../../domain/entities';
import { OllamaItineraryService } from './OllamaItineraryService';

export class ClaudeItineraryService implements IItineraryService {
  private fallback: OllamaItineraryService;
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.fallback = new OllamaItineraryService();
  }

  private buildPrompt(ctx: TripContext): string {
    const parts = [
      `You are an expert travel planner. Create a detailed, realistic day-by-day itinerary.`,
      `Destination: ${ctx.destination}`,
      `Dates: ${ctx.startDate} to ${ctx.endDate}`,
      `Trip purpose: ${ctx.tripPurpose}`,
    ];
    if (ctx.energyLevel) parts.push(`Energy level preference: ${ctx.energyLevel}`);
    if (ctx.dietaryPref) parts.push(`Dietary preference: ${ctx.dietaryPref}`);
    if (ctx.savedPlaces?.length) parts.push(`Must-include places: ${ctx.savedPlaces.join(', ')}`);
    if (ctx.calendarEvents?.length) {
      parts.push(`Fixed events (respect these times):`);
      ctx.calendarEvents.forEach((e) =>
        parts.push(`  - ${e.title}: ${e.start} to ${e.end}${e.location ? ' at ' + e.location : ''}`)
      );
    }
    if (ctx.weather?.daily?.length) {
      parts.push(`Weather forecast:`);
      ctx.weather.daily.forEach((d) =>
        parts.push(`  ${d.date}: ${d.description}, ${d.tempMin}-${d.tempMax}°C, ${d.precipitationProbability}% rain`)
      );
    }
    parts.push(`
Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "events": [
        {
          "time": "HH:MM",
          "duration_minutes": 90,
          "type": "activity|food|transport|break|meeting|sightseeing|shopping",
          "title": "...",
          "description": "...",
          "location": "...",
          "isGapSuggestion": false,
          "isBreathingRoom": false,
          "culturalNudge": "optional tip"
        }
      ],
      "freeGaps": []
    }
  ],
  "documentChecklist": ["item1", "item2"],
  "culturalNudges": ["tip1", "tip2"]
}

Use real, well-known places in ${ctx.destination}. Include 6-8 events per day. Add at least one breathing room break per day (type: "break", isBreathingRoom: true). Language: ${ctx.lang || 'en'}.`);
    return parts.join('\n');
  }

  async generateItinerary(context: TripContext): Promise<ItineraryPlan> {
    if (!this.apiKey) {
      console.warn('ANTHROPIC_API_KEY not set, using fallback itinerary service');
      return this.fallback.generateItinerary(context);
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 8000,
          messages: [{ role: 'user', content: this.buildPrompt(context) }],
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API returned ${response.status}`);
      }

      const data: any = await response.json();
      const text = data.content?.[0]?.text || '';

      // Strip markdown code fences if present
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return parsed as ItineraryPlan;
    } catch (error) {
      console.warn('Claude API failed, using fallback:', (error as Error).message);
      return this.fallback.generateItinerary(context);
    }
  }
}
