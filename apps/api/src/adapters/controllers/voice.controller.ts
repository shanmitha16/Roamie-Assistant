import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../infrastructure/middleware/auth';

const router = Router();

/**
 * POST /api/voice
 * Takes user speech text and returns an AI response.
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: 'No text provided', code: 'VALIDATION_ERROR' });
      return;
    }

    // Since this is for a hackathon demo and Render won't have local Ollama,
    // we provide a smart fallback or use external AI if available.
    
    let responseText = "I'm sorry, I couldn't process that request right now.";
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('hello') || lowerText.includes('hi')) {
      responseText = "Hello! I'm Roamie, your AI travel companion. How can I help you plan your next adventure?";
    } else if (lowerText.includes('weather')) {
      responseText = "I can check the weather for you. Which destination are you interested in?";
    } else if (lowerText.includes('trip') || lowerText.includes('plan')) {
      responseText = "I'd love to help you plan a trip! You can start by telling me where you want to go.";
    } else if (lowerText.includes('who are you')) {
      responseText = "I am Roamie, an AI designed to make your travel planning seamless and fun.";
    } else {
      // Mocking a generic AI response for other queries
      responseText = `That sounds interesting! As your travel companion, I'd suggest looking into local experiences and hidden gems for "${text}". What else would you like to know?`;
    }

    res.json({ response: responseText });
  } catch (error) {
    console.error('Voice AI Error:', error);
    res.status(500).json({ error: 'Failed to process voice request', code: 'SERVER_ERROR' });
  }
});

export default router;
