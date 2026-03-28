export interface AgentContext {
  tripId: string;
  flightId: string;
  [key: string]: any;
}

export abstract class BaseAgent<TInput, TOutput> {
  constructor(
    protected name: string,
    protected description: string
  ) {}

  public getName(): string { return this.name; }
  
  abstract execute(input: TInput, context: AgentContext): Promise<TOutput>;
}
