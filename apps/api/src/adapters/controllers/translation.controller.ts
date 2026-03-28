import { Router, Request, Response } from 'express';

const router = Router();

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// POST /api/translate
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    if (!text || !targetLang) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const srcLabel = sourceLang || 'auto-detect the language';
    const prompt = `Translate the following text from ${srcLabel} to ${targetLang}. Return ONLY the translated text, nothing else.\n\nText: "${text}"`;

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      const data: any = await response.json();
      const translated = (data.response || '').trim();

      res.json({
        original: text,
        translated: translated || text,
        sourceLang: sourceLang || 'auto',
        targetLang,
      });
    } catch {
      // Fallback: return original text with a note
      res.json({
        original: text,
        translated: text,
        sourceLang: sourceLang || 'auto',
        targetLang,
        note: 'Translation service unavailable — showing original text',
      });
    }
  } catch {
    res.status(500).json({ error: 'Translation failed', code: 'SERVER_ERROR' });
  }
});

export default router;
