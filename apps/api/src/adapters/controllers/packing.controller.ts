import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../infrastructure/middleware/auth';
import { GeneratePackingList } from '../../use-cases/GeneratePackingList';
import { PrismaTripRepository } from '../repositories/PrismaTripRepository';

const router = Router();
const tripRepo = new PrismaTripRepository();
const packingUseCase = new GeneratePackingList();

router.get('/:tripId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.tripId as string;
    const trip = await tripRepo.findTripById(tripId);
    if (!trip) { res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' }); return; }
    if (trip.userId !== req.userId) { res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' }); return; }

    const days = await tripRepo.findItineraryDays(tripId);
    const allEvents = days.flatMap(d => Array.isArray(d.events) ? d.events : []);

    const list = await packingUseCase.execute({
      events: allEvents,
      destination: trip.destination,
      tripPurpose: 'leisure',
      lang: req.lang || 'en',
    });

    res.json({ items: list });
  } catch {
    res.status(500).json({ error: 'Failed to generate packing list', code: 'SERVER_ERROR' });
  }
});

export default router;
