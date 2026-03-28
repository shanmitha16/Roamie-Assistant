import { AgentContext } from './BaseAgent';
import { SearchAgent } from './SearchAgent';
import { BookingAgent } from './BookingAgent';
import { ClawbotAgent } from './ClawbotAgent';

export class DisruptionCoordinator {
  constructor(
    private searchAgent: SearchAgent,
    private bookingAgent: BookingAgent,
    private clawbotAgent: ClawbotAgent
  ) {}

  async run(tripId: string, cancelledFlightId: string, simulateZeroFlights: boolean = false): Promise<any> {
    const context: AgentContext = { tripId, flightId: cancelledFlightId, simulateZeroFlights };
    
    // Step 1: Search Agent finds alternatives
    const flights = await this.searchAgent.execute(null, context);
    
    if (flights && flights.length > 0) {
      // Step 2: Booking Agent selects the absolute cheapest
      const bookingResult = await this.bookingAgent.execute(flights, context);
      
      // Step 3: Clawbot notifies user with payment prompt
      const message = await this.clawbotAgent.execute({ 
        type: 'success', 
        booking: bookingResult 
      }, context);
      
      return {
        status: 'resolved',
        alternativeFlights: flights,
        selectedFlight: bookingResult.flight,
        confirmationToken: bookingResult.token,
        clawbotMessage: message
      };
    } else {
      // Step 2 (Alternative): Clawbot notifies user of zero options
      const message = await this.clawbotAgent.execute({ 
        type: 'failure', 
        reason: 'no_flights' 
      }, context);
      
      return {
        status: 'failed',
        alternativeFlights: [],
        clawbotMessage: message
      };
    }
  }
}
