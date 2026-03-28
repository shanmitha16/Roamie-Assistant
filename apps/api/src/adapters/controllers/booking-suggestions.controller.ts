/**
 * Booking Suggestions Controller — Generates AI-powered hotel and flight
 * suggestions near the itinerary destination using Ollama with algorithmic fallback.
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../infrastructure/middleware/auth';
import prisma from '../../infrastructure/database';

const router = Router();

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

const HOTEL_CHAINS = [
  'Taj Hotels', 'The Oberoi', 'ITC Hotels', 'Radisson Blu', 'Marriott',
  'Hyatt Regency', 'Holiday Inn', 'Novotel', 'The Leela', 'JW Marriott',
  'Four Seasons', 'Hilton', 'Shangri-La', 'Ritz-Carlton', 'InterContinental',
];

const HOTEL_AMENITIES_POOL = [
  'Free WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Room Service',
  'Airport Shuttle', 'Parking', 'Business Center', 'Bar', 'Rooftop Terrace',
];

const AIRLINES = [
  { name: 'IndiGo', code: '6E' }, { name: 'Air India', code: 'AI' },
  { name: 'SpiceJet', code: 'SG' }, { name: 'Vistara', code: 'UK' },
  { name: 'Emirates', code: 'EK' }, { name: 'Singapore Airlines', code: 'SQ' },
  { name: 'Qatar Airways', code: 'QR' }, { name: 'British Airways', code: 'BA' },
  { name: 'Lufthansa', code: 'LH' }, { name: 'ANA', code: 'NH' },
];

const CITY_IATA: Record<string, string> = {
  'singapore': 'SIN', 'chennai': 'MAA', 'mumbai': 'BOM', 'delhi': 'DEL',
  'new delhi': 'DEL', 'bangalore': 'BLR', 'bengaluru': 'BLR', 'kolkata': 'CCU',
  'hyderabad': 'HYD', 'london': 'LHR', 'paris': 'CDG', 'tokyo': 'NRT',
  'new york': 'JFK', 'dubai': 'DXB', 'bangkok': 'BKK', 'goa': 'GOI',
  'jaipur': 'JAI', 'kochi': 'COK', 'pune': 'PNQ', 'sydney': 'SYD',
  'hong kong': 'HKG', 'kuala lumpur': 'KUL', 'amsterdam': 'AMS',
  'frankfurt': 'FRA', 'doha': 'DOH', 'istanbul': 'IST', 'los angeles': 'LAX',
  'san francisco': 'SFO',
};

function getIATA(city: string): string {
  return CITY_IATA[city.toLowerCase().trim()] || city.substring(0, 3).toUpperCase();
}

function randomFrom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateHotels(destination: string, startDate: string, endDate: string) {
  const chosen = randomFrom(HOTEL_CHAINS, 5);
  const nights = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000));

  return chosen.map((name, i) => {
    const stars = 3 + Math.floor(Math.random() * 3); // 3-5 stars
    const pricePerNight = stars === 5 ? 8000 + Math.floor(Math.random() * 12000) :
                         stars === 4 ? 4000 + Math.floor(Math.random() * 6000) :
                                       2000 + Math.floor(Math.random() * 3000);
    const distance = (0.3 + Math.random() * 4).toFixed(1);
    const rating = (7.5 + Math.random() * 2).toFixed(1);
    const reviewCount = 200 + Math.floor(Math.random() * 2000);
    const amenities = randomFrom(HOTEL_AMENITIES_POOL, 4 + Math.floor(Math.random() * 3));
    const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}&checkin=${startDate}&checkout=${endDate}`;

    return {
      id: `hotel-${Date.now()}-${i}`,
      name: `${name} ${destination}`,
      stars,
      pricePerNight,
      totalPrice: pricePerNight * nights,
      nights,
      distance: `${distance} km from center`,
      rating: parseFloat(rating),
      reviewCount,
      amenities,
      bookingUrl,
      checkIn: startDate,
      checkOut: endDate,
    };
  }).sort((a, b) => b.rating - a.rating);
}

function generateFlights(destination: string, startDate: string) {
  const chosen = randomFrom(AIRLINES, 5);
  const destIATA = getIATA(destination);

  return chosen.map((airline, i) => {
    const depHour = 6 + Math.floor(Math.random() * 14); // 6AM - 8PM
    const depMin = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
    const durHours = 1.5 + Math.random() * 6;
    const hours = Math.floor(durHours);
    const mins = Math.round((durHours - hours) * 60);
    const price = 3000 + Math.floor(Math.random() * 18000);
    const seats = 2 + Math.floor(Math.random() * 20);
    const flightNum = `${airline.code}-${1000 + Math.floor(Math.random() * 9000)}`;
    const dateStr = startDate.replace(/-/g, '').substring(2);
    const bookingUrl = `https://www.skyscanner.co.in/transport/flights/DEL/${destIATA}/${dateStr}/`;

    return {
      id: `flight-${Date.now()}-${i}`,
      flightNumber: flightNum,
      airline: airline.name,
      departure: `${depHour.toString().padStart(2, '0')}:${depMin.toString().padStart(2, '0')}`,
      duration: `${hours}h ${mins}m`,
      price,
      seatsAvailable: seats,
      destination,
      bookingUrl,
      date: startDate,
    };
  }).sort((a, b) => a.price - b.price);
}

// GET /api/booking-suggestions/:tripId
router.get('/:tripId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.tripId as string;
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const startDate = trip.startDate.toISOString().split('T')[0];
    const endDate = trip.endDate.toISOString().split('T')[0];

    // Try Ollama-enhanced generation
    let hotels, flights;
    try {
      const prompt = `Generate hotel and flight suggestions for a trip to ${trip.destination} from ${startDate} to ${endDate}.

Return JSON with this exact structure:
{
  "hotels": [{"name": "Hotel Name City", "stars": 4, "pricePerNight": 5000, "amenities": ["WiFi", "Pool"]}],
  "flights": [{"airline": "IndiGo", "flightNumber": "6E-2341", "price": 6000, "departure": "08:30", "duration": "2h 30m"}]
}

Use REAL hotel chain names and REAL airline names. Use realistic INR prices. Return ONLY JSON.`;

      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, format: 'json' }),
        signal: AbortSignal.timeout(12000),
      });

      if (response.ok) {
        const data: any = await response.json();
        const parsed = JSON.parse(data.response || '{}');
        // Use AI data if valid, fall through otherwise
        if (parsed.hotels?.length > 0 || parsed.flights?.length > 0) {
          // Enrich with missing fields
          hotels = (parsed.hotels || []).slice(0, 5).map((h: any, i: number) => ({
            id: `hotel-ai-${Date.now()}-${i}`,
            name: h.name || `${HOTEL_CHAINS[i]} ${trip.destination}`,
            stars: h.stars || 4,
            pricePerNight: h.pricePerNight || 5000,
            totalPrice: (h.pricePerNight || 5000) * Math.max(1, Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / 86400000)),
            nights: Math.max(1, Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / 86400000)),
            distance: `${(0.5 + Math.random() * 3).toFixed(1)} km from center`,
            rating: parseFloat((7.5 + Math.random() * 2).toFixed(1)),
            reviewCount: 300 + Math.floor(Math.random() * 1500),
            amenities: h.amenities || randomFrom(HOTEL_AMENITIES_POOL, 4),
            bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(trip.destination)}&checkin=${startDate}&checkout=${endDate}`,
            checkIn: startDate,
            checkOut: endDate,
          }));
          flights = (parsed.flights || []).slice(0, 5).map((f: any, i: number) => ({
            id: `flight-ai-${Date.now()}-${i}`,
            flightNumber: f.flightNumber || `${AIRLINES[i].code}-${1000 + Math.floor(Math.random() * 9000)}`,
            airline: f.airline || AIRLINES[i].name,
            departure: f.departure || '08:00',
            duration: f.duration || '2h 30m',
            price: f.price || 5000 + Math.floor(Math.random() * 10000),
            seatsAvailable: 3 + Math.floor(Math.random() * 15),
            destination: trip.destination,
            bookingUrl: `https://www.skyscanner.co.in/transport/flights/DEL/${getIATA(trip.destination)}/${startDate.replace(/-/g, '').substring(2)}/`,
            date: startDate,
          }));
        }
      }
    } catch {
      // Ollama failed, fall through to algorithmic
    }

    // Fallback to algorithmic generation
    if (!hotels) hotels = generateHotels(trip.destination, startDate, endDate);
    if (!flights) flights = generateFlights(trip.destination, startDate);

    res.json({ hotels, flights });
  } catch (error) {
    console.error('Booking suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

export default router;
