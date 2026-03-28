/**
 * SmartPackingAgent — Generates weather + agenda-aware packing lists
 * by analyzing the itinerary events and weather forecast.
 */

import { BaseAgent, AgentContext } from './BaseAgent';
import { ItineraryEvent, WeatherForecast, PackingItem } from '../domain/entities';

interface PackingInput {
  events: ItineraryEvent[];
  weather: WeatherForecast;
  destination: string;
  tripPurpose: string;
  lang: string;
}

export class SmartPackingAgent extends BaseAgent<PackingInput, PackingItem[]> {
  private baseUrl: string;
  private model: string;

  constructor() {
    super('SmartPackingAgent', 'Generates weather + agenda-aware smart packing lists.');
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
  }

  async execute(input: PackingInput, context: AgentContext): Promise<PackingItem[]> {
    // Try AI-generated list first
    try {
      return await this.generateWithAI(input);
    } catch (e) {
      console.warn('Smart packing AI failed, using rule-based fallback:', (e as Error).message);
      return this.generateRuleBased(input);
    }
  }

  private async generateWithAI(input: PackingInput): Promise<PackingItem[]> {
    const weatherSummary = input.weather.daily.slice(0, 5).map(d =>
      `${d.date}: ${d.description}, ${d.tempMin}-${d.tempMax}°C, ${d.precipitationProbability}% rain`
    ).join('\n');

    const eventTypes = [...new Set(input.events.map(e => e.type))].join(', ');
    const activityTitles = input.events.slice(0, 10).map(e => e.title).join(', ');

    const prompt = `Generate a smart packing list for a trip to ${input.destination}.

Weather forecast:
${weatherSummary}

Trip activities include: ${eventTypes}
Specific activities: ${activityTitles}
Trip purpose: ${input.tripPurpose}

Return a JSON array of packing items:
[{ "category": "clothing|toiletries|documents|tech|misc", "item": "...", "reason": "why this item is needed", "essential": true/false }]

Rules:
- If rain > 40%, include umbrella/rain jacket
- If temp > 30°C, include sunscreen, light clothes
- If business meetings, include formal attire
- If sightseeing, include comfortable walking shoes
- Always include basics: passport, charger, toiletries
- Return 12-18 items total
- Return ONLY valid JSON, no markdown.`;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, stream: false, format: 'json' }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const data: any = await response.json();
    const parsed = JSON.parse(data.response || '[]');
    return (Array.isArray(parsed) ? parsed : parsed.items || parsed.packingList || []) as PackingItem[];
  }

  private generateRuleBased(input: PackingInput): PackingItem[] {
    const items: PackingItem[] = [];
    const weather = input.weather.daily;
    
    const hasRain = weather.some(d => d.precipitationProbability > 40);
    const isHot = weather.some(d => d.tempMax > 30);
    const isCold = weather.some(d => d.tempMin < 15);
    const hasMeeting = input.events.some(e => e.type === 'meeting');
    const hasSightseeing = input.events.some(e => e.type === 'sightseeing' || e.type === 'activity');

    // Essential documents
    items.push({ category: 'documents', item: 'Passport & Visa', reason: 'Required for international travel', essential: true });
    items.push({ category: 'documents', item: 'Travel Insurance', reason: 'Medical and trip protection', essential: true });
    items.push({ category: 'documents', item: 'Hotel & Flight Confirmations', reason: 'Proof of booking', essential: true });

    // Tech
    items.push({ category: 'tech', item: 'Phone Charger & Power Bank', reason: 'Keep devices charged while traveling', essential: true });
    items.push({ category: 'tech', item: 'Universal Adapter', reason: 'Different power outlets at destination', essential: true });

    // Toiletries
    items.push({ category: 'toiletries', item: 'Toiletry Kit', reason: 'Basic hygiene essentials', essential: true });

    // Weather-specific
    if (hasRain) {
      items.push({ category: 'misc', item: 'Umbrella / Rain Jacket', reason: `Rain expected (${weather.find(d => d.precipitationProbability > 40)?.precipitationProbability}% chance)`, essential: true });
    }
    if (isHot) {
      items.push({ category: 'toiletries', item: 'Sunscreen SPF 50+', reason: `High temperatures expected (${weather.find(d => d.tempMax > 30)?.tempMax}°C)`, essential: true });
      items.push({ category: 'clothing', item: 'Light, Breathable Clothes', reason: 'Hot weather — choose cotton or linen', essential: true });
      items.push({ category: 'misc', item: 'Refillable Water Bottle', reason: 'Stay hydrated in the heat', essential: false });
    }
    if (isCold) {
      items.push({ category: 'clothing', item: 'Warm Jacket / Layers', reason: `Cold temperatures expected (${weather.find(d => d.tempMin < 15)?.tempMin}°C)`, essential: true });
      items.push({ category: 'clothing', item: 'Thermal Innerwear', reason: 'Extra warmth for cold days', essential: false });
    }

    // Activity-specific
    if (hasMeeting) {
      items.push({ category: 'clothing', item: 'Formal Attire', reason: 'Business meetings on your itinerary', essential: true });
      items.push({ category: 'clothing', item: 'Dress Shoes', reason: 'Professional appearance for meetings', essential: true });
    }
    if (hasSightseeing) {
      items.push({ category: 'clothing', item: 'Comfortable Walking Shoes', reason: 'Lots of sightseeing and walking planned', essential: true });
      items.push({ category: 'misc', item: 'Daypack / Small Backpack', reason: 'Carry essentials while exploring', essential: false });
    }

    // General
    items.push({ category: 'clothing', item: 'Casual Outfits (3-4 sets)', reason: 'General daily wear', essential: true });
    items.push({ category: 'misc', item: 'Travel Neck Pillow', reason: 'Comfort during long flights', essential: false });

    return items;
  }
}
