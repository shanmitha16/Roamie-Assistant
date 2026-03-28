import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../infrastructure/middleware/auth';
import prisma from '../../infrastructure/database';

function safeParseJSON(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

const router = Router();

const createTripSchema = z.object({
  destination: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createTripSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' });
      return;
    }

    const trip = await prisma.trip.create({
      data: {
        userId: req.userId!,
        destination: parsed.data.destination,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
      },
    });

    res.status(201).json({ trip });
  } catch {
    res.status(500).json({ error: 'Failed to create trip', code: 'SERVER_ERROR' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { userId: req.userId },
      include: {
        flights: true,
        hotels: true,
        cabs: true,
        itinerary: { orderBy: { date: 'asc' } },
      },
      orderBy: { startDate: 'asc' },
    });

    const tripsWithParsedData = trips.map((t) => ({
      ...t,
      itinerary: t.itinerary.map((day) => ({
        ...day,
        events: safeParseJSON(day.events),
        freeGaps: safeParseJSON(day.freeGaps),
      })),
    }));

    res.json({ trips: tripsWithParsedData });
  } catch {
    res.status(500).json({ error: 'Failed to fetch trips', code: 'SERVER_ERROR' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id as string },
      include: {
        flights: true,
        hotels: true,
        cabs: true,
        itinerary: { orderBy: { date: 'asc' } },
      },
    });

    if (!trip) {
      res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' });
      return;
    }
    if (trip.userId !== req.userId) {
      res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }

    res.json({
      trip: {
        ...trip,
        itinerary: trip.itinerary.map((day) => ({
          ...day,
          events: safeParseJSON(day.events),
          freeGaps: safeParseJSON(day.freeGaps),
        })),
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch trip', code: 'SERVER_ERROR' });
  }
});

router.post('/:id/flights', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tripCheck = await prisma.trip.findUnique({ where: { id: req.params.id as string } });
    if (!tripCheck) {
      res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' });
      return;
    }
    if (tripCheck.userId !== req.userId) {
      res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }

    const flightSchema = z.object({
      flightNumber: z.string(),
      origin: z.string(),
      destination: z.string(),
      departureTime: z.string(),
      arrivalTime: z.string(),
      airline: z.string(),
      price: z.number().optional().default(0),
    });

    const parsed = flightSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' });
      return;
    }

    const flight = await prisma.flightBooking.create({
      data: {
        tripId: req.params.id as string,
        ...parsed.data,
        departureTime: new Date(parsed.data.departureTime),
        arrivalTime: new Date(parsed.data.arrivalTime),
      },
    });

    res.status(201).json({ flight });
  } catch {
    res.status(500).json({ error: 'Failed to add flight', code: 'SERVER_ERROR' });
  }
});

router.post('/:id/hotels', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tripCheck = await prisma.trip.findUnique({ where: { id: req.params.id as string } });
    if (!tripCheck) {
      res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' });
      return;
    }
    if (tripCheck.userId !== req.userId) {
      res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }

    const hotelSchema = z.object({
      hotelName: z.string(),
      checkIn: z.string(),
      checkOut: z.string(),
    });

    const parsed = hotelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' });
      return;
    }

    const hotel = await prisma.hotelBooking.create({
      data: {
        tripId: req.params.id as string,
        hotelName: parsed.data.hotelName,
        checkIn: new Date(parsed.data.checkIn),
        checkOut: new Date(parsed.data.checkOut),
      },
    });

    res.status(201).json({ hotel });
  } catch {
    res.status(500).json({ error: 'Failed to add hotel', code: 'SERVER_ERROR' });
  }
});

// DELETE /api/trips/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.id as string;
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.userId !== req.userId) {
      res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' });
      return;
    }
    await prisma.disruptionLog.deleteMany({ where: { tripId } });
    await prisma.expense.deleteMany({ where: { tripId } });
    await prisma.cabBooking.deleteMany({ where: { tripId } });
    await prisma.hotelBooking.deleteMany({ where: { tripId } });
    await prisma.flightBooking.deleteMany({ where: { tripId } });
    await prisma.itineraryDay.deleteMany({ where: { tripId } });
    await prisma.trip.delete({ where: { id: tripId } });
    res.json({ message: 'Trip deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete trip', code: 'SERVER_ERROR' });
  }
});

// PATCH /api/trips/:id/status
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['active', 'completed', 'cancelled', 'disrupted'].includes(status)) {
      res.status(400).json({ error: 'Invalid status', code: 'VALIDATION_ERROR' });
      return;
    }
    const tripId = req.params.id as string;
    const tripCheck = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!tripCheck) {
      res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' });
      return;
    }
    if (tripCheck.userId !== req.userId) {
      res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }
    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: { status },
    });
    res.json({ trip });
  } catch {
    res.status(500).json({ error: 'Failed to update trip status', code: 'SERVER_ERROR' });
  }
});

// PATCH /api/trips/:id/budget
router.patch('/:id/budget', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { budget, budgetCurrency } = req.body;
    const tripId = req.params.id as string;
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.userId !== req.userId) {
      res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' });
      return;
    }
    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: { budget: Number(budget) || 0, budgetCurrency: budgetCurrency || 'INR' },
    });
    res.json({ trip: updated });
  } catch {
    res.status(500).json({ error: 'Failed to update budget', code: 'SERVER_ERROR' });
  }
});

// GET /api/trips/:id/budget-summary
router.get('/:id/budget-summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.id as string;
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.userId !== req.userId) {
      res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' });
      return;
    }
    const expenses = await prisma.expense.findMany({ where: { tripId } });
    const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = expenses.reduce((acc: Record<string, number>, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
    res.json({
      budget: (trip as any).budget || 0,
      budgetCurrency: (trip as any).budgetCurrency || 'INR',
      spent,
      remaining: ((trip as any).budget || 0) - spent,
      percentUsed: (trip as any).budget ? Math.round((spent / (trip as any).budget) * 100) : 0,
      byCategory,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch budget summary', code: 'SERVER_ERROR' });
  }
});

export default router;
