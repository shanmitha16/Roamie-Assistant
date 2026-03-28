import { IExpenseService } from '../domain/interfaces';

export class ScanExpenseReceipt {
  constructor(private expenseService?: IExpenseService) {}

  async execute(params: {
    receiptText: string;
    lang: string;
  }): Promise<{ amount: number; currency: string; category: string; description: string; date?: string }> {
    try {
      if (this.expenseService) {
        return await this.expenseService.scanReceipt(params.receiptText, params.lang);
      }
      return this.regexFallback(params.receiptText);
    } catch (error) {
      // Regex fallback parsing
      return this.regexFallback(params.receiptText);
    }
  }

  private regexFallback(text: string): { amount: number; currency: string; category: string; description: string; date?: string } {
    // Try to extract amount
    const amountPatterns = [
      /(?:total|amount|grand\s*total|net|due)[:\s]*[₹$€£¥]?\s*([\d,]+\.?\d*)/i,
      /[₹$€£¥]\s*([\d,]+\.?\d*)/,
      /([\d,]+\.?\d*)\s*(?:USD|EUR|GBP|INR|JPY)/i,
    ];

    let amount = 0;
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    if (!amount) {
      const nums = text.match(/\d+\.?\d*/g);
      if (nums) {
        const sorted = nums.map(Number).sort((a, b) => b - a);
        amount = sorted[0] || 0;
      }
    }

    // Currency detection
    let currency = 'USD';
    if (/₹|INR|rupee/i.test(text)) currency = 'INR';
    else if (/€|EUR/i.test(text)) currency = 'EUR';
    else if (/£|GBP/i.test(text)) currency = 'GBP';
    else if (/¥|JPY|yen/i.test(text)) currency = 'JPY';
    else if (/\$|USD/i.test(text)) currency = 'USD';

    // Category detection
    let category = 'other';
    const lower = text.toLowerCase();
    if (/restaurant|food|café|cafe|coffee|lunch|dinner|breakfast|meal|pizza|burger|sushi|ramen/i.test(lower)) category = 'food';
    else if (/taxi|cab|uber|grab|lyft|bus|train|metro|flight|airport|transport/i.test(lower)) category = 'transport';
    else if (/hotel|hostel|airbnb|inn|resort|lodge|accommodation|check.?in/i.test(lower)) category = 'accommodation';
    else if (/museum|tour|ticket|park|attraction|temple|show|concert|activity/i.test(lower)) category = 'activity';

    // Description
    const firstLine = text.split('\n').filter(l => l.trim())[0] || 'Scanned receipt';
    const description = firstLine.substring(0, 100).trim();

    // Date detection
    let date: string | undefined;
    const dateMatch = text.match(/(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})/);
    if (dateMatch) date = dateMatch[0];

    return { amount, currency, category, description, date };
  }
}
