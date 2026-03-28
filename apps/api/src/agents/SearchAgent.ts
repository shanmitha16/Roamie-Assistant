import { BaseAgent, AgentContext } from './BaseAgent';
import { IFlightService } from '../domain/interfaces';
import prisma from '../infrastructure/database';

export class SearchAgent extends BaseAgent<null, any[]> {
  constructor(private flightService: IFlightService) {
    super('SearchAgent', 'Finds alternative flights based on original flight data.');
  }

  async execute(input: null, context: AgentContext): Promise<any[]> {
    const flight = await prisma.flightBooking.findUnique({
      where: { id: context.flightId }
    });
    
    if (!flight) throw new Error(`Flight with id '${context.flightId}' not found`);
    
    // Optional: Simulating a 0-flight catastrophic scenario based on context flag
    if (context.simulateZeroFlights) {
      return [];
    }

    const alternatives = await this.flightService.findAlternatives(
      flight.origin,
      flight.destination,
      flight.departureTime
    );
    
    return alternatives;
  }
}
