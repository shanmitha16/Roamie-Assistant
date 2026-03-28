import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../infrastructure/middleware/auth';
import { BuildItinerary } from '../../use-cases/BuildItinerary';
import { PrismaTripRepository } from '../repositories/PrismaTripRepository';
import { ClaudeItineraryService } from '../services/ClaudeItineraryService';
import prisma from '../../infrastructure/database';

const router = Router();
const tripRepo = new PrismaTripRepository();
const itineraryService = new ClaudeItineraryService();
const buildItinerary = new BuildItinerary(tripRepo, itineraryService);

const buildSchema = z.object({
  tripId: z.string().min(1),
  calendarEvents: z.array(z.object({
    title: z.string(),
    start: z.string(),
    end: z.string(),
    location: z.string().optional(),
  })).optional().default([]),
  savedPlaces: z.array(z.string()).optional().default([]),
  energyLevel: z.enum(['high', 'medium', 'low']).optional(),
});

// POST /api/itinerary/build — build full itinerary
router.post('/build', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = buildSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' });
      return;
    }

    const plan = await buildItinerary.execute({
      tripId: parsed.data.tripId,
      calendarEvents: parsed.data.calendarEvents,
      savedPlaces: parsed.data.savedPlaces,
      energyLevel: parsed.data.energyLevel,
      lang: req.lang,
    });

    res.json(plan);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg === 'Trip not found') {
      res.status(404).json({ error: msg, code: 'NOT_FOUND' });
      return;
    }
    res.status(500).json({ error: msg, code: 'SERVER_ERROR' });
  }
});

// GET /api/itinerary/days/:tripId
router.get('/days/:tripId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const days = await tripRepo.findItineraryDays(req.params.tripId as string);
    res.json({ days });
  } catch {
    res.status(500).json({ error: 'Failed to fetch itinerary', code: 'SERVER_ERROR' });
  }
});

// PUT /api/itinerary/day/:dayId — update events for a specific day
router.put('/day/:dayId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      res.status(400).json({ error: 'events must be an array', code: 'VALIDATION_ERROR' });
      return;
    }
    const dayId = req.params.dayId as string;

    // Save previous version before overwrite
    const existing = await prisma.itineraryDay.findUnique({ where: { id: dayId } });
    const day = await prisma.itineraryDay.update({
      where: { id: dayId },
      data: {
        events: JSON.stringify(events),
        previousVersion: existing?.events || null,
      },
    });
    res.json({ day: { ...day, events, freeGaps: JSON.parse(day.freeGaps as string) } });
  } catch {
    res.status(500).json({ error: 'Failed to update day', code: 'SERVER_ERROR' });
  }
});

// GET /api/itinerary/:tripId/export — plain-text itinerary export
router.get('/:tripId/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.tripId as string;
    const days = await tripRepo.findItineraryDays(tripId);
    if (!days.length) {
      res.status(404).json({ error: 'No itinerary found', code: 'NOT_FOUND' });
      return;
    }
    let text = `ITINERARY EXPORT\n${'='.repeat(40)}\n\n`;
    for (const day of days) {
      text += `📅 ${new Date(day.date).toDateString()}\n${'-'.repeat(30)}\n`;
      const events: any[] = (() => {
        try { return Array.isArray(day.events) ? day.events : JSON.parse(day.events as any); } catch { return []; }
      })();
      for (const evt of events) {
        text += `  ${evt.time} — [${(evt.type || 'activity').toUpperCase()}] ${evt.title}\n`;
        text += `         📍 ${evt.location || 'N/A'}\n`;
        text += `         ${evt.description || ''}\n\n`;
      }
    }
    res.setHeader('Content-Type', 'text/plain');
    res.send(text);
  } catch {
    res.status(500).json({ error: 'Export failed', code: 'SERVER_ERROR' });
  }
});

// POST /api/itinerary/regenerate — regenerate full itinerary
router.post('/regenerate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId, date, energyLevel, savedPlaces } = req.body;
    if (!tripId || !date) {
      res.status(400).json({ error: 'tripId and date required', code: 'VALIDATION_ERROR' });
      return;
    }

    const plan = await buildItinerary.execute({
      tripId,
      energyLevel,
      savedPlaces: savedPlaces || [],
      lang: req.lang,
    });

    const requestedDay = plan.days.find((d: any) => d.date === date) || plan.days[0];
    res.json({ day: requestedDay });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: msg, code: 'SERVER_ERROR' });
  }
});

// POST /api/itinerary/regenerate-day — regenerate a single day (Feature 1)
router.post('/regenerate-day', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId, dayId, energyLevel } = req.body;
    if (!tripId || !dayId) {
      res.status(400).json({ error: 'tripId and dayId required', code: 'VALIDATION_ERROR' });
      return;
    }

    const trip = await tripRepo.findTripById(tripId);
    if (!trip) { res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' }); return; }

    const user = await tripRepo.findUserById(trip.userId);
    if (!user) { res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' }); return; }

    const days = await tripRepo.findItineraryDays(tripId);
    const targetDay = days.find(d => d.id === dayId);
    if (!targetDay) { res.status(404).json({ error: 'Day not found', code: 'NOT_FOUND' }); return; }

    const context = {
      destination: trip.destination,
      startDate: targetDay.date.toISOString().split('T')[0],
      endDate: targetDay.date.toISOString().split('T')[0],
      tripPurpose: user.tripPurpose,
      savedPlaces: [],
      calendarEvents: [],
      dietaryPref: user.dietaryPref,
      lang: req.lang || user.preferredLang || 'en',
      energyLevel: energyLevel || 'medium',
    };

    const plan = await itineraryService.generateItinerary(context);
    const newDay = plan.days[0];

    if (newDay) {
      await tripRepo.upsertItineraryDay({
        tripId,
        date: targetDay.date,
        events: JSON.stringify(newDay.events),
        freeGaps: JSON.stringify(newDay.freeGaps || []),
        previousVersion: JSON.stringify(targetDay.events),
      });
    }

    res.json({ day: { ...targetDay, events: newDay?.events || [], id: dayId } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: msg, code: 'SERVER_ERROR' });
  }
});

// POST /api/itinerary/notes — save a note for an event (Feature 2)
router.post('/notes', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId, dayId, eventTime, note } = req.body;
    if (!tripId || !dayId || !eventTime || !note) {
      res.status(400).json({ error: 'tripId, dayId, eventTime, note required', code: 'VALIDATION_ERROR' });
      return;
    }
    const noteId = `${dayId}-${eventTime}`;
    const saved = await prisma.itineraryNote.upsert({
      where: { id: noteId },
      create: { id: noteId, tripId, dayId, eventTime, note, userId: req.userId! },
      update: { note },
    });
    res.json({ note: saved });
  } catch {
    res.status(500).json({ error: 'Failed to save note', code: 'SERVER_ERROR' });
  }
});

// GET /api/itinerary/notes/:tripId — get all notes for a trip (Feature 2)
router.get('/notes/:tripId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const notes = await prisma.itineraryNote.findMany({
      where: { tripId: req.params.tripId as string, userId: req.userId },
    });
    res.json({ notes });
  } catch {
    res.status(500).json({ error: 'Failed to fetch notes', code: 'SERVER_ERROR' });
  }
});

// POST /api/itinerary/undo/:dayId — restore previous version (Feature 5)
router.post('/undo/:dayId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const dayId = req.params.dayId as string;
    const day = await prisma.itineraryDay.findUnique({ where: { id: dayId } });
    if (!day || !day.previousVersion) {
      res.status(404).json({ error: 'No previous version available', code: 'NOT_FOUND' });
      return;
    }
    const restored = await prisma.itineraryDay.update({
      where: { id: dayId },
      data: {
        events: day.previousVersion,
        previousVersion: day.events,
      },
    });
    const events = (() => { try { return JSON.parse(restored.events as string); } catch { return []; } })();
    res.json({ day: { ...restored, events } });
  } catch {
    res.status(500).json({ error: 'Failed to undo', code: 'SERVER_ERROR' });
  }
});

// GET /api/itinerary/:tripId/weather-warnings — weather-aware warnings (Feature 6)
router.get('/:tripId/weather-warnings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.tripId as string;
    const trip = await tripRepo.findTripById(tripId);
    if (!trip) { res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' }); return; }

    const days = await tripRepo.findItineraryDays(tripId);
    const warnings: Array<{ date: string; event: string; warning: string; severity: string }> = [];

    try {
      const { WeatherService } = await import('../services/WeatherService');
      const { GeocodingService } = await import('../services/GeocodingService');
      const weatherSvc = new WeatherService();
      const geocodingSvc = new GeocodingService();

      const coords = await geocodingSvc.getCoords(trip.destination);
      if (coords) {
        const forecast = await weatherSvc.getForecast(coords.lat, coords.lng, Math.min(days.length, 7));
        days.forEach((day, i) => {
          const weather = forecast.daily[i];
          if (!weather) return;
          const events: any[] = Array.isArray(day.events) ? day.events : [];
          events.forEach(evt => {
            const isOutdoor = ['sightseeing', 'activity', 'shopping', 'transport'].includes(evt.type);
            if (isOutdoor && weather.precipitationProbability > 60) {
              warnings.push({
                date: weather.date,
                event: evt.title,
                warning: `${weather.precipitationProbability}% chance of rain — consider indoor alternative or umbrella`,
                severity: weather.precipitationProbability > 80 ? 'high' : 'medium',
              });
            }
          });
        });
      }
    } catch {
      // Weather service unavailable — return empty warnings
    }

    res.json({ warnings });
  } catch {
    res.status(500).json({ error: 'Failed to generate weather warnings', code: 'SERVER_ERROR' });
  }
});

export default router;
