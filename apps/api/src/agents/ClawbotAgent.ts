import { BaseAgent, AgentContext } from './BaseAgent';

export class ClawbotAgent extends BaseAgent<any, string> {
  constructor() {
    super('ClawbotAgent', 'User-facing conversational agent that delivers news/options natively.');
  }

  async execute(input: { type: 'success' | 'failure', booking?: any, reason?: string }, context: AgentContext): Promise<string> {
    const defaultSuccess = `Your flight was cancelled, but I've secured the best alternative for ₹${input.booking?.flight?.price}. Tap below to review and pay before it sells out.`;
    const defaultFailure = `URGENT: Your flight was cancelled and NO alternatives are available right now. Please seek ground staff immediately.`;

    const prompt = input.type === 'success' && input.booking
      ? `You are Clawbot, a proactive travel assistant. The user's flight was cancelled but you found the cheapest alternative: Flight ${input.booking.flight.flightNumber} on ${input.booking.flight.airline} for ₹${input.booking.flight.price}. Write a comforting, urgent 2-sentence SMS alerting them to tap to pay before it sells out.`
      : `You are Clawbot, a proactive travel assistant. The user's flight was cancelled and there are ZERO alternative flights available. Write a 2-sentence urgent message advising them to seek ground staff immediately.`;

    // Try Claude first
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 200, messages: [{ role: 'user', content: prompt }] }),
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) {
          const data: any = await response.json();
          return (data.content?.[0]?.text || '').trim() || (input.type === 'success' ? defaultSuccess : defaultFailure);
        }
      } catch { /* fall through */ }
    }

    // Try Ollama
    try {
      const response = await fetch((process.env.OLLAMA_BASE_URL || 'http://localhost:11434') + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'llama3', prompt, stream: false }),
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) {
        const data: any = await response.json();
        return (data.response || '').trim() || (input.type === 'success' ? defaultSuccess : defaultFailure);
      }
    } catch { /* fall through */ }

    return input.type === 'success' ? defaultSuccess : defaultFailure;
  }
}
