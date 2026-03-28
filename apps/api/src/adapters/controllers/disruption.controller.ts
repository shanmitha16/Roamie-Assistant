import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../infrastructure/middleware/auth';
import { TriggerDisruptionShield } from '../../use-cases/TriggerDisruptionShield';
import { PrismaTripRepository } from '../repositories/PrismaTripRepository';
import { MockFlightService } from '../services/MockFlightService';
import { ClaudeItineraryService } from '../services/ClaudeItineraryService';
import { QRCodeService } from '../services/QRCodeService';
import { disruptionLimiter } from '../../infrastructure/middleware/rateLimiter';
import prisma from '../../infrastructure/database';

const router = Router();
const tripRepo = new PrismaTripRepository();
const flightService = new MockFlightService();
const itineraryService = new ClaudeItineraryService();
const qrService = new QRCodeService();
const disruptionShield = new TriggerDisruptionShield(tripRepo, flightService, itineraryService, qrService);

// Store pending confirmations in memory (demo purposes)
const pendingConfirmations = new Map<string, { flightNumber: string; amount: number; tripId: string; status: string }>();

const triggerSchema = z.object({
  tripId: z.string().min(1),
  flightId: z.string().min(1),
  disruptionType: z.enum(['cancelled', 'delayed', 'missed']),
  simulateZeroFlights: z.boolean().optional().default(false),
});

router.post('/trigger', authMiddleware, disruptionLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = triggerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' });
      return;
    }

    // Ownership check
    const trip = await prisma.trip.findUnique({ where: { id: parsed.data.tripId } });
    if (!trip) {
      res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' });
      return;
    }
    if (trip.userId !== req.userId) {
      res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }

    const resolution = await disruptionShield.execute({
      tripId: parsed.data.tripId,
      flightId: parsed.data.flightId,
      disruptionType: parsed.data.disruptionType,
      simulateZeroFlights: parsed.data.simulateZeroFlights,
      lang: req.lang,
    });

    // Store pending confirmation
    pendingConfirmations.set(resolution.confirmationToken, {
      flightNumber: resolution.selectedFlight.flightNumber,
      amount: resolution.selectedFlight.price,
      tripId: parsed.data.tripId,
      status: 'pending',
    });

    res.json(resolution);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('not found')) {
      res.status(404).json({ error: msg, code: 'NOT_FOUND' });
      return;
    }
    res.status(500).json({ error: msg, code: 'SERVER_ERROR' });
  }
});

// Confirm disruption resolution via QR token
router.post('/confirm/:token', async (req, res: Response) => {
  try {
    const { token } = req.params;
    const pending = pendingConfirmations.get(token);

    if (!pending) {
      res.status(404).json({ error: 'Confirmation token not found or expired', code: 'NOT_FOUND' });
      return;
    }

    pending.status = 'confirmed';
    pendingConfirmations.set(token, pending);

    // Update trip status
    await prisma.trip.update({
      where: { id: pending.tripId },
      data: { status: 'active' },
    });

    res.json({
      message: 'Booking confirmed successfully',
      flightNumber: pending.flightNumber,
      amount: pending.amount,
      status: 'confirmed',
    });
  } catch {
    res.status(500).json({ error: 'Failed to confirm booking', code: 'SERVER_ERROR' });
  }
});

// Cancel disruption resolution via QR token
router.post('/cancel/:token', async (req, res: Response) => {
  try {
    const { token } = req.params;
    const pending = pendingConfirmations.get(token);

    if (!pending) {
      res.status(404).json({ error: 'Confirmation token not found or expired', code: 'NOT_FOUND' });
      return;
    }

    pending.status = 'cancelled';
    pendingConfirmations.set(token, pending);

    res.json({
      message: 'Booking cancelled',
      flightNumber: pending.flightNumber,
      status: 'cancelled',
    });
  } catch {
    res.status(500).json({ error: 'Failed to cancel booking', code: 'SERVER_ERROR' });
  }
});

// Get disruption log for a trip
router.get('/log/:tripId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.disruptionLog.findMany({
      where: { tripId: req.params.tripId as string },
      orderBy: { detectedAt: 'desc' },
    });
    res.json({ logs });
  } catch {
    res.status(500).json({ error: 'Failed to fetch disruption log', code: 'SERVER_ERROR' });
  }
});

export default router;
