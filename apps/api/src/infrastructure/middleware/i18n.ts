import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

const SUPPORTED_LANGS = ['en', 'hi', 'es', 'fr', 'ja'];

export function i18nMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const acceptLang = req.headers['accept-language'];
  let lang = 'en';

  if (acceptLang) {
    const requested = acceptLang.split(',')[0].split('-')[0].toLowerCase();
    if (SUPPORTED_LANGS.includes(requested)) {
      lang = requested;
    }
  }

  if (req.query.lang && typeof req.query.lang === 'string') {
    const queryLang = req.query.lang.toLowerCase();
    if (SUPPORTED_LANGS.includes(queryLang)) {
      lang = queryLang;
    }
  }

  req.lang = lang;
  next();
}
