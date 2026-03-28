import { BaseAgent, AgentContext } from './BaseAgent';
import crypto from 'crypto';

export class BookingAgent extends BaseAgent<any[], { flight: any, token: string }> {
  constructor() {
    super('BookingAgent', 'Analyzes flights and pre-books the cheapest option.');
  }

  async execute(flights: any[], context: AgentContext): Promise<{ flight: any, token: string }> {
    if (!flights || flights.length === 0) {
      throw new Error('BookingAgent received no flights.');
    }

    // Agent Logic: Prioritize the absolute cheapest flight
    const cheapestFlight = flights.sort((a, b) => (a.price || 0) - (b.price || 0))[0];

    const token = crypto.randomBytes(32).toString('hex');

    return { flight: cheapestFlight, token };
  }
}
