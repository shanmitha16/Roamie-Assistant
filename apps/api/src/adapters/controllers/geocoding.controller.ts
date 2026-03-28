import { Router, Request, Response } from 'express';
import { GeocodingService } from '../services/GeocodingService';

const router = Router();
const geocoding = new GeocodingService();

// GET /api/geocode/autocomplete?q=chennai
router.get('/autocomplete', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const results = await geocoding.autocomplete(q);
    res.json({ results });
  } catch {
    res.status(500).json({ error: 'Geocoding failed', code: 'SERVER_ERROR' });
  }
});

// GET /api/geocode/coords?q=chennai
router.get('/coords', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const coords = await geocoding.getCoords(q);
    if (!coords) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(coords);
  } catch {
    res.status(500).json({ error: 'Geocoding failed', code: 'SERVER_ERROR' });
  }
});

export default router;
