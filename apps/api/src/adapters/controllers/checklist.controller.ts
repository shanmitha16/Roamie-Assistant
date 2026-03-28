import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../infrastructure/middleware/auth';
import { GeneratePackingList } from '../../use-cases/GeneratePackingList';
import { GenerateDocChecklist } from '../../use-cases/GenerateDocChecklist';
import { GetLawNudges } from '../../use-cases/GetLawNudges';
import { PrismaTripRepository } from '../repositories/PrismaTripRepository';

const router = Router();
const tripRepo = new PrismaTripRepository();
const packingUseCase = new GeneratePackingList();
const docChecklistUseCase = new GenerateDocChecklist();
const lawNudgesUseCase = new GetLawNudges();

// GET /api/checklist/:tripId — combined packing + visa/doc checklist
router.get('/:tripId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.tripId as string;
    const trip = await tripRepo.findTripById(tripId);
    if (!trip) { res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' }); return; }

    const user = await tripRepo.findUserById(trip.userId);
    if (!user) { res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' }); return; }

    const itineraryDays = await tripRepo.findItineraryDays(tripId);
    const allEvents = itineraryDays.flatMap(d => d.events);

    // Generate packing list
    const packingList = await packingUseCase.execute({
      events: allEvents,
      destination: trip.destination,
      tripPurpose: user.tripPurpose,
      lang: req.lang || 'en',
    });

    // Generate doc/visa checklist
    const docChecklist = await docChecklistUseCase.execute({
      passportCountry: user.passportCountry || 'IN',
      destination: trip.destination,
      lang: req.lang || 'en',
    });

    // Get law nudges
    const eventCategories = [...new Set(allEvents.map(e => e.type))];
    const lawNudges = lawNudgesUseCase.execute({
      destination: trip.destination,
      eventCategories,
    });

    res.json({ packingList, docChecklist, lawNudges });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate checklist', code: 'SERVER_ERROR' });
  }
});

// GET /api/checklist/:tripId/law-nudges
router.get('/:tripId/law-nudges', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.tripId as string;
    const trip = await tripRepo.findTripById(tripId);
    if (!trip) { res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' }); return; }

    const itineraryDays = await tripRepo.findItineraryDays(tripId);
    const eventCategories = [...new Set(itineraryDays.flatMap(d => d.events.map(e => e.type)))];

    const nudges = lawNudgesUseCase.execute({ destination: trip.destination, eventCategories });
    res.json({ nudges });
  } catch {
    res.status(500).json({ error: 'Failed to get law nudges', code: 'SERVER_ERROR' });
  }
});

export default router;
