import { Router, Request, Response } from 'express';

const router = Router();

const LANG_MAP: Record<string, string> = {
  'english': 'en', 'hindi': 'hi', 'spanish': 'es', 'french': 'fr',
  'japanese': 'ja', 'german': 'de', 'chinese': 'zh', 'arabic': 'ar',
  'korean': 'ko', 'tamil': 'ta'
};

// POST /api/translate
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    if (!text || !targetLang) {
      res.status(400).json({ error: 'text and targetLang are required' });
      return;
    }

    const srcCode = (!sourceLang || sourceLang.toLowerCase() === 'auto') ? 'auto' : sourceLang;
    const targetLabel = String(targetLang).toLowerCase();
    const destCode = LANG_MAP[targetLabel] || targetLang;

    // Try multiple translation endpoints for reliability
    const translationResult = await tryTranslate(text, srcCode, destCode);

    res.json({
      original: text,
      translated: translationResult || text,
      sourceLang: sourceLang || 'auto',
      targetLang,
    });

  } catch (err) {
    console.error('Translation endpoint error:', err);
    res.status(500).json({ error: 'Translation failed', code: 'SERVER_ERROR' });
  }
});

async function tryTranslate(text: string, srcCode: string, destCode: string): Promise<string> {
  // If source == dest, return as-is
  if (srcCode === destCode) return text;

  // Attempt 1: Google Translate (gtx client)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(srcCode)}&tl=${encodeURIComponent(destCode)}&dt=t&q=${encodeURIComponent(text)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data: any = await response.json();
    let translated = '';
    if (data && data[0]) {
      for (const item of data[0]) {
        if (item && item[0]) translated += item[0];
      }
    }

    const result = translated.trim();
    // Validate translation actually happened (not just echo)
    if (result && result.toLowerCase() !== text.toLowerCase()) {
      return result;
    }
    // If Google returned the same text, it may have failed silently
    throw new Error('Translation echoed input');
  } catch (e1) {
    console.warn('Google Translate gtx failed:', (e1 as Error).message);
  }

  // Attempt 2: MyMemory free API (no auth needed, 5000 chars/day)
  try {
    const langPair = `${srcCode === 'auto' ? 'en' : srcCode}|${destCode}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: any = await response.json();

    if (data?.responseData?.translatedText) {
      const result = data.responseData.translatedText.trim();
      if (result && result.toLowerCase() !== text.toLowerCase()) {
        return result;
      }
    }
    throw new Error('MyMemory returned no result');
  } catch (e2) {
    console.warn('MyMemory API failed:', (e2 as Error).message);
  }

  // Attempt 3: LibreTranslate public instance
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: srcCode === 'auto' ? 'auto' : srcCode,
        target: destCode,
        format: 'text',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: any = await response.json();
    if (data?.translatedText) {
      return data.translatedText.trim();
    }
    throw new Error('LibreTranslate returned no result');
  } catch (e3) {
    console.warn('LibreTranslate failed:', (e3 as Error).message);
  }

  // All failed — return original with marker
  console.error('All translation backends failed for:', text.substring(0, 50));
  return `[Translation unavailable] ${text}`;
}

export default router;
