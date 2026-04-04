import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

export interface AnalyticsProvider {
  track(event: string, properties: Record<string, any>, userId?: string): void;
  identify(userId: string, traits: Record<string, any>): void;
}

export interface TrackedEvent {
  event: string;
  properties: Record<string, any>;
  userId?: string;
  timestamp: Date;
}

export class ConsoleAnalyticsProvider implements AnalyticsProvider {
  private readonly logger = new Logger('Analytics');

  track(event: string, properties: Record<string, any>, userId?: string): void {
    this.logger.log(
      JSON.stringify({ type: 'track', event, properties, userId, timestamp: new Date().toISOString() }),
    );
  }

  identify(userId: string, traits: Record<string, any>): void {
    this.logger.log(
      JSON.stringify({ type: 'identify', userId, traits, timestamp: new Date().toISOString() }),
    );
  }
}

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private provider: AnalyticsProvider;
  private buffer: TrackedEvent[] = [];
  private readonly maxBufferSize = 1000;
  private flushInterval: NodeJS.Timeout;

  constructor() {
    this.provider = new ConsoleAnalyticsProvider();
    // Flush buffer every 30 seconds
    this.flushInterval = setInterval(() => this.flush(), 30_000);
  }

  onModuleDestroy() {
    clearInterval(this.flushInterval);
    this.flush();
  }

  /**
   * Replace the default analytics provider (e.g. with Segment, PostHog).
   */
  setProvider(provider: AnalyticsProvider): void {
    this.provider = provider;
  }

  track(event: string, properties: Record<string, any>, userId?: string): void {
    const tracked: TrackedEvent = {
      event,
      properties,
      userId,
      timestamp: new Date(),
    };

    this.buffer.push(tracked);

    // Evict oldest events when buffer is full
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.maxBufferSize);
    }

    this.provider.track(event, properties, userId);
  }

  identify(userId: string, traits: Record<string, any>): void {
    this.provider.identify(userId, traits);
  }

  /**
   * Flush the in-memory buffer. Called periodically and on shutdown.
   */
  flush(): TrackedEvent[] {
    const events = [...this.buffer];
    // In a real implementation this would send to a remote service.
    // For now we simply return the flushed batch.
    return events;
  }

  /**
   * Return the most recent events from the buffer.
   */
  getRecentEvents(limit = 100): TrackedEvent[] {
    return this.buffer.slice(-limit).reverse();
  }

  /**
   * Return aggregated counts by event type.
   */
  getStats(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of this.buffer) {
      counts[event.event] = (counts[event.event] || 0) + 1;
    }
    return counts;
  }
}
