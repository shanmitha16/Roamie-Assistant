/**
 * RealFlightService — Generates realistic flight alternatives using Ollama AI
 * and includes Skyscanner booking deep links for each flight.
 * 
 * If AMADEUS_API_KEY is set, it would use Amadeus API (future extension).
 * For now, uses Ollama to generate realistic flights with real airline names,
 * IATA codes, and plausible pricing, plus Skyscanner deep links.
 */

import { IFlightService } from '../../domain/interfaces';
import { AlternativeFlight } from '../../domain/entities';

const REAL_AIRLINES = [
  { name: 'IndiGo', code: '6E' },
  { name: 'Air India', code: 'AI' },
  { name: 'SpiceJet', code: 'SG' },
  { name: 'Vistara', code: 'UK' },
  { name: 'Emirates', code: 'EK' },
  { name: 'Singapore Airlines', code: 'SQ' },
  { name: 'Qatar Airways', code: 'QR' },
  { name: 'Lufthansa', code: 'LH' },
  { name: 'British Airways', code: 'BA' },
  { name: 'Thai Airways', code: 'TG' },
  { name: 'Japan Airlines', code: 'JL' },
  { name: 'ANA', code: 'NH' },
  { name: 'Delta Air Lines', code: 'DL' },
  { name: 'United Airlines', code: 'UA' },
  { name: 'Cathay Pacific', code: 'CX' },
];

// IATA city codes for Skyscanner deep links
const CITY_TO_IATA: Record<string, string> = {
  'singapore': 'SIN', 'sin': 'SIN',
  'chennai': 'MAA', 'maa': 'MAA',
  'mumbai': 'BOM', 'bom': 'BOM',
  'delhi': 'DEL', 'del': 'DEL',
  'new delhi': 'DEL',
  'bangalore': 'BLR', 'blr': 'BLR', 'bengaluru': 'BLR',
  'kolkata': 'CCU', 'ccu': 'CCU',
  'hyderabad': 'HYD', 'hyd': 'HYD',
  'london': 'LHR', 'lhr': 'LHR',
  'paris': 'CDG', 'cdg': 'CDG',
  'tokyo': 'NRT', 'nrt': 'NRT',
  'new york': 'JFK', 'jfk': 'JFK',
  'dubai': 'DXB', 'dxb': 'DXB',
  'hong kong': 'HKG', 'hkg': 'HKG',
  'bangkok': 'BKK', 'bkk': 'BKK',
  'sydney': 'SYD', 'syd': 'SYD',
  'los angeles': 'LAX', 'lax': 'LAX',
  'san francisco': 'SFO', 'sfo': 'SFO',
  'kuala lumpur': 'KUL', 'kul': 'KUL',
  'doha': 'DOH', 'doh': 'DOH',
  'frankfurt': 'FRA', 'fra': 'FRA',
  'amsterdam': 'AMS', 'ams': 'AMS',
  'istanbul': 'IST', 'ist': 'IST',
  'goa': 'GOI', 'goi': 'GOI',
  'jaipur': 'JAI', 'jai': 'JAI',
  'kochi': 'COK', 'cok': 'COK',
  'pune': 'PNQ', 'pnq': 'PNQ',
};

function getIATA(city: string): string {
  const lower = city.toLowerCase().trim();
  return CITY_TO_IATA[lower] || city.substring(0, 3).toUpperCase();
}

function buildSkyscannerUrl(origin: string, destination: string, date: Date): string {
  const originIATA = getIATA(origin);
  const destIATA = getIATA(destination);
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  return `https://www.skyscanner.co.in/transport/flights/${originIATA}/${destIATA}/${dateStr.substring(2)}/`;
}

export class RealFlightService implements IFlightService {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
  }

  async findAlternatives(
    origin: string,
    destination: string,
    date: Date,
    preferences?: { seatPreference?: string; originalPrice?: number }
  ): Promise<AlternativeFlight[]> {
    // Try Ollama-generated realistic flights first
    try {
      const flights = await this.generateWithOllama(origin, destination, date);
      if (flights.length > 0) return flights;
    } catch (e) {
      console.warn('Ollama flight generation failed, using algorithmic fallback:', (e as Error).message);
    }

    // Algorithmic fallback: generate realistic flights programmatically
    return this.generateAlgorithmic(origin, destination, date);
  }

  private async generateWithOllama(origin: string, destination: string, date: Date): Promise<AlternativeFlight[]> {
    const prompt = `Generate 3 realistic alternative flights from ${origin} to ${destination} on ${date.toISOString().split('T')[0]}.
Use REAL airline names (IndiGo, Air India, Emirates, Singapore Airlines, Vistara, SpiceJet, etc).
Use realistic IATA flight numbers (e.g., 6E-2341, AI-505, SQ-423).
Use realistic prices in INR (₹3000-₹25000 for domestic, ₹15000-₹80000 for international).
Use realistic durations.

Return ONLY a JSON array:
[{ "flightNumber": "6E-2341", "airline": "IndiGo", "price": 4500, "durationHours": 2.5, "seatsAvailable": 12, "departureHourOffset": 2 }]
Return ONLY valid JSON, no markdown.`;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, stream: false, format: 'json' }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const data: any = await response.json();
    const text = data.response || '';
    
    let parsed: any[];
    try {
      const jsonObj = JSON.parse(text);
      parsed = Array.isArray(jsonObj) ? jsonObj : (jsonObj.flights || jsonObj.alternatives || [jsonObj]);
    } catch {
      throw new Error('Failed to parse Ollama flight response');
    }

    const baseDate = new Date(date);
    const skyscannerUrl = buildSkyscannerUrl(origin, destination, baseDate);

    return parsed.slice(0, 3).map((f: any, i: number) => {
      const depOffset = (f.departureHourOffset || (i + 1) * 2);
      const depTime = new Date(baseDate.getTime() + depOffset * 3600000);
      const durHours = f.durationHours || 2 + Math.random() * 4;
      const arrTime = new Date(depTime.getTime() + durHours * 3600000);
      const hours = Math.floor(durHours);
      const mins = Math.round((durHours - hours) * 60);

      return {
        flightNumber: f.flightNumber || `${REAL_AIRLINES[i % REAL_AIRLINES.length].code}-${1000 + Math.floor(Math.random() * 9000)}`,
        airline: f.airline || REAL_AIRLINES[i % REAL_AIRLINES.length].name,
        origin,
        destination,
        departureTime: depTime,
        arrivalTime: arrTime,
        price: f.price || 5000 + Math.floor(Math.random() * 15000),
        duration: `${hours}h ${mins}m`,
        seatsAvailable: f.seatsAvailable || Math.floor(Math.random() * 20) + 1,
        seatClass: 'economy',
        amenities: [],
        bookingUrl: skyscannerUrl,
      } as AlternativeFlight;
    });
  }

  private generateAlgorithmic(origin: string, destination: string, date: Date): AlternativeFlight[] {
    const baseDate = new Date(date);
    const skyscannerUrl = buildSkyscannerUrl(origin, destination, baseDate);
    
    // Pick 3 random airlines
    const shuffled = [...REAL_AIRLINES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    // Estimate if domestic or international
    const isDomestic = ['MAA', 'BOM', 'DEL', 'BLR', 'CCU', 'HYD', 'GOI', 'JAI', 'COK', 'PNQ']
      .includes(getIATA(origin)) && 
      ['MAA', 'BOM', 'DEL', 'BLR', 'CCU', 'HYD', 'GOI', 'JAI', 'COK', 'PNQ']
      .includes(getIATA(destination));

    return selected.map((airline, i) => {
      const depOffset = (i + 1) * 3 + Math.floor(Math.random() * 2);
      const depTime = new Date(baseDate.getTime() + depOffset * 3600000);
      const durHours = isDomestic ? (1.5 + Math.random() * 2) : (4 + Math.random() * 8);
      const arrTime = new Date(depTime.getTime() + durHours * 3600000);
      const hours = Math.floor(durHours);
      const mins = Math.round((durHours - hours) * 60);
      const price = isDomestic
        ? 3000 + Math.floor(Math.random() * 8000)
        : 15000 + Math.floor(Math.random() * 45000);

      return {
        flightNumber: `${airline.code}-${1000 + Math.floor(Math.random() * 9000)}`,
        airline: airline.name,
        origin,
        destination,
        departureTime: depTime,
        arrivalTime: arrTime,
        price,
        duration: `${hours}h ${mins}m`,
        seatsAvailable: 2 + Math.floor(Math.random() * 18),
        seatClass: 'economy',
        amenities: [],
        score: 0.7 + Math.random() * 0.3,
        bookingUrl: skyscannerUrl,
      } as AlternativeFlight;
    }).sort((a, b) => (b.score || 0) - (a.score || 0));
  }
}
