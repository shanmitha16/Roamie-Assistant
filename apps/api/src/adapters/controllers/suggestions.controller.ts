import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../infrastructure/middleware/auth';
import { LiveSuggestionAgent } from '../../agents/LiveSuggestionAgent';
import { WeatherService } from '../services/WeatherService';
import { GeocodingService } from '../services/GeocodingService';
import prisma from '../../infrastructure/database';

const router = Router();
const suggestionAgent = new LiveSuggestionAgent();
const weatherService = new WeatherService();
const geocoding = new GeocodingService();

// GET /api/suggestions/:tripId
router.get('/:tripId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.tripId as string;

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const days = await prisma.itineraryDay.findMany({
      where: { tripId },
      orderBy: { date: 'asc' },
    });

    if (days.length === 0) {
      res.json({ suggestions: [] });
      return;
    }

    // Get today's events
    const today = new Date().toISOString().split('T')[0];
    const todayDay = days.find(d => d.date.toISOString().split('T')[0] === today) || days[0];
    let events: any[] = [];
    try {
      events = typeof todayDay.events === 'string'
        ? JSON.parse(todayDay.events)
        : (todayDay.events as any[]) || [];
    } catch {
      events = [];
    }

    // Fetch weather for destination
    let weather: any = null;
    try {
      const coords = await geocoding.getCoords(trip.destination);
      if (coords) {
        const forecast = await weatherService.getForecast(coords.lat, coords.lng, 1);
        if (forecast.daily.length > 0) {
          const d = forecast.daily[0];
          weather = {
            currentTemp: d.tempMax,
            description: d.description,
            precipitationProbability: d.precipitationProbability,
          };
        }
      }
    } catch {
      // Weather fetch failed, continue without
    }

    const suggestions = await suggestionAgent.execute({
      events,
      weather,
      currentHour: new Date().getHours(),
      destination: trip.destination,
    }, { tripId, flightId: '' });

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions', code: 'SERVER_ERROR' });
  }
});

export default router;
