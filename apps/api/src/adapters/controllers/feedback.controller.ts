import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Optional: Middleware to check if user is admin
// Since req.user is populated by your auth middleware (if applied), we can check it.
// We'll write a simple middleware here:
const requireAdmin = async (req: any, res: any, next: any) => {
  // Assuming req.user is set by existing auth middleware (e.g. JWT)
  // If not, we'd need to parse the token here. Let's assume the router
  // is mounted AFTER the auth middleware, or we'll just check the db directly
  // if an admin email is provided, but typically the token has it.
  
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || (!user.isAdmin && user.email !== 'admin@roamie.app')) {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error checking admin status' });
  }
};

// 1. POST /api/feedback - Public route to submit feedback
router.post('/', async (req, res) => {
  try {
    const { name, email, rating, message } = req.body;

    if (!rating || !message) {
      return res.status(400).json({ error: 'Rating and message are required' });
    }

    const feedback = await prisma.feedback.create({
      data: {
        name,
        email,
        rating: Number(rating),
        message,
      },
    });

    res.status(201).json({ success: true, feedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// 2. GET /api/feedback - Admin only route to list feedback
// Note: We need to make sure authMiddleware is applied before requireAdmin
// when mounting it in index.ts.
export const getFeedbackRoutes = (authMiddleware: any) => {
  const secureRouter = Router();

  secureRouter.use(authMiddleware);
  secureRouter.use(requireAdmin);

  secureRouter.get('/', async (req, res) => {
    try {
      const { sort = 'latest', filter = '' } = req.query;

      let orderBy: any = { createdAt: 'desc' };
      if (sort === 'rating') {
        orderBy = { rating: 'desc' };
      }

      let where: any = {};
      if (filter) {
        where = {
          OR: [
            { message: { contains: String(filter) } },
            { name: { contains: String(filter) } },
            { email: { contains: String(filter) } },
          ],
        };
      }

      const feedbackMap = await prisma.feedback.findMany({
        where,
        orderBy,
      });

      res.status(200).json({ feedback: feedbackMap });
    } catch (error) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ error: 'Failed to fetch feedback' });
    }
  });

  secureRouter.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.feedback.delete({
        where: { id },
      });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting feedback:', error);
      res.status(500).json({ error: 'Failed to delete feedback' });
    }
  });

  return secureRouter;
};

export default router;
