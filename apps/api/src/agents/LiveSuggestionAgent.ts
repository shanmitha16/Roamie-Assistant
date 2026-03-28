/**
 * LiveSuggestionAgent — Generates real-time itinerary adjustment suggestions
 * based on weather changes, time gaps, and crowd data.
 */

import { BaseAgent, AgentContext } from './BaseAgent';

interface SuggestionInput {
  events: any[];
  weather?: {
    currentTemp: number;
    description: string;
    precipitationProbability: number;
  };
  currentHour: number;
  destination: string;
}

interface Suggestion {
  id: string;
  type: 'weather' | 'time' | 'crowd' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
}

export class LiveSuggestionAgent extends BaseAgent<SuggestionInput, Suggestion[]> {
  private baseUrl: string;
  private model: string;

  constructor() {
    super('LiveSuggestionAgent', 'Generates real-time itinerary adjustment suggestions.');
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
  }

  async execute(input: SuggestionInput, context: AgentContext): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Weather-based suggestions
    if (input.weather) {
      suggestions.push(...this.getWeatherSuggestions(input));
    }

    // Time gap suggestions
    suggestions.push(...this.getTimeGapSuggestions(input));

    // Try AI enhancement
    try {
      const aiSuggestions = await this.getAISuggestions(input);
      suggestions.push(...aiSuggestions);
    } catch {
      // AI suggestions are bonus, not critical
    }

    return suggestions.slice(0, 5); // Max 5 suggestions
  }

  private getWeatherSuggestions(input: SuggestionInput): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const w = input.weather!;

    if (w.precipitationProbability > 60) {
      // Find outdoor activities that could be affected
      const outdoorEvents = input.events.filter(e =>
        e.type === 'sightseeing' || e.type === 'activity'
      );
      
      if (outdoorEvents.length > 0) {
        suggestions.push({
          id: `weather-rain-${Date.now()}`,
          type: 'weather',
          priority: 'high',
          title: '🌧️ Rain Alert — Swap outdoor plans',
          description: `${w.precipitationProbability}% chance of rain. Consider moving "${outdoorEvents[0].title}" to an indoor alternative like a museum or café.`,
          action: 'swap_to_indoor',
        });
      }
    }

    if (w.currentTemp > 38) {
      suggestions.push({
        id: `weather-heat-${Date.now()}`,
        type: 'weather',
        priority: 'high',
        title: '🌡️ Extreme Heat Warning',
        description: `It's ${w.currentTemp}°C outside. Reschedule afternoon outdoor activities to early morning or evening. Stay in air-conditioned spaces between 12-4 PM.`,
        action: 'reschedule_afternoon',
      });
    }

    if (w.currentTemp < 5) {
      suggestions.push({
        id: `weather-cold-${Date.now()}`,
        type: 'weather',
        priority: 'medium',
        title: '❄️ Cold Weather Advisory',
        description: `Temperature is ${w.currentTemp}°C. Layer up and consider warm indoor activities. Hot soup restaurants nearby might be a great option.`,
      });
    }

    return suggestions;
  }

  private getTimeGapSuggestions(input: SuggestionInput): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Find gaps between events
    for (let i = 0; i < input.events.length - 1; i++) {
      const currentEnd = this.timeToMinutes(input.events[i].time) + (input.events[i].duration_minutes || 60);
      const nextStart = this.timeToMinutes(input.events[i + 1].time);
      const gap = nextStart - currentEnd;

      if (gap >= 60 && gap <= 120) {
        suggestions.push({
          id: `gap-${i}-${Date.now()}`,
          type: 'time',
          priority: 'low',
          title: `⏱️ ${gap}-minute gap available`,
          description: `There's a ${gap}-minute gap between "${input.events[i].title}" and "${input.events[i + 1].title}". Perfect time for a local café visit or quick shopping.`,
          action: 'fill_gap',
        });
      }
    }

    return suggestions.slice(0, 2); // Max 2 gap suggestions
  }

  private async getAISuggestions(input: SuggestionInput): Promise<Suggestion[]> {
    const eventSummary = input.events.slice(0, 6).map(e => `${e.time}: ${e.title} (${e.type})`).join('\n');
    
    const prompt = `Given this itinerary in ${input.destination}:
${eventSummary}

Current weather: ${input.weather?.description || 'unknown'}, ${input.weather?.currentTemp || 25}°C
Time: ${input.currentHour}:00

Suggest ONE smart optimization. Return JSON:
{"title": "...", "description": "1-2 sentence suggestion", "priority": "high|medium|low"}
Return ONLY valid JSON.`;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, stream: false, format: 'json' }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];
    const data: any = await response.json();
    const parsed = JSON.parse(data.response || '{}');
    
    if (parsed.title) {
      return [{
        id: `ai-${Date.now()}`,
        type: 'recommendation',
        priority: parsed.priority || 'medium',
        title: `💡 ${parsed.title}`,
        description: parsed.description || '',
      }];
    }
    return [];
  }

  private timeToMinutes(t: string): number {
    const [h, m] = (t || '09:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
}
