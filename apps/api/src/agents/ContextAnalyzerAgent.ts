/**
 * ContextAnalyzerAgent — Analyzes user context (time of day, weather, trip purpose, mood)
 * and produces a ContextProfile that enriches itinerary generation.
 */

import { BaseAgent, AgentContext } from './BaseAgent';

export interface ContextProfile {
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
  preferIndoor: boolean;
  energySuggestion: 'high' | 'medium' | 'low';
  moodBased: string; // e.g. "relaxation", "adventure", "cultural"
  weatherAware: string; // e.g. "carry umbrella", "sunscreen recommended"
}

interface ContextInput {
  currentHour: number;
  weather?: { tempMax: number; precipitationProbability: number; description: string };
  tripPurpose: string;
  mood?: string;
  energyLevel?: string;
}

export class ContextAnalyzerAgent extends BaseAgent<ContextInput, ContextProfile> {
  private baseUrl: string;
  private model: string;

  constructor() {
    super('ContextAnalyzerAgent', 'Analyzes user context to generate personalized recommendations.');
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
  }

  async execute(input: ContextInput, context: AgentContext): Promise<ContextProfile> {
    // Determine time slot
    const timeSlot = this.getTimeSlot(input.currentHour);
    
    // Weather-based decisions
    const rainChance = input.weather?.precipitationProbability ?? 0;
    const temp = input.weather?.tempMax ?? 28;
    const preferIndoor = rainChance > 60 || temp > 40 || temp < 5;
    
    const weatherAware = rainChance > 50
      ? 'Rain likely — carry an umbrella and plan indoor activities'
      : temp > 35
      ? 'Very hot — stay hydrated, prefer air-conditioned venues in the afternoon'
      : temp < 10
      ? 'Cold weather — dress warm, hot beverages recommended'
      : 'Pleasant weather — great for outdoor activities';

    // Energy suggestion based on time + purpose
    let energySuggestion: 'high' | 'medium' | 'low' = 'medium';
    if (input.energyLevel) {
      energySuggestion = input.energyLevel as any;
    } else if (timeSlot === 'morning') {
      energySuggestion = 'high';
    } else if (timeSlot === 'evening' || timeSlot === 'night') {
      energySuggestion = 'low';
    }

    // Mood-based activity type
    let moodBased = 'balanced';
    if (input.mood) {
      try {
        moodBased = await this.analyzeMoodWithAI(input.mood);
      } catch {
        moodBased = this.analyzeMoodLocal(input.mood);
      }
    } else {
      moodBased = input.tripPurpose === 'business' ? 'productivity' : 
                  input.tripPurpose === 'adventure' ? 'adventure' : 'cultural';
    }

    return { timeSlot, preferIndoor, energySuggestion, moodBased, weatherAware };
  }

  private getTimeSlot(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  private analyzeMoodLocal(mood: string): string {
    const lower = mood.toLowerCase();
    if (lower.includes('relax') || lower.includes('calm') || lower.includes('peace')) return 'relaxation';
    if (lower.includes('adventure') || lower.includes('thrill') || lower.includes('excit')) return 'adventure';
    if (lower.includes('culture') || lower.includes('history') || lower.includes('museum')) return 'cultural';
    if (lower.includes('food') || lower.includes('eat') || lower.includes('culinary')) return 'culinary';
    if (lower.includes('shop') || lower.includes('buy') || lower.includes('mall')) return 'shopping';
    return 'balanced';
  }

  private async analyzeMoodWithAI(mood: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: `The user described their mood as: "${mood}". Categorize this into exactly ONE word from: relaxation, adventure, cultural, culinary, shopping, nightlife, nature, wellness, or balanced. Reply with ONLY the one word.`,
        stream: false,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data: any = await response.json();
    return (data.response || 'balanced').trim().toLowerCase();
  }
}
