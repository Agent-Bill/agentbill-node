// AgentBill SDK - Main Entry Point
export { AgentBillWrapper } from './wrapper';
export { AgentBillTracer } from './tracer';
export * from './types';

import { AgentBillWrapper } from './wrapper';
import type { AgentBillConfig } from './types';

/**
 * Initialize AgentBill SDK
 * 
 * @example
 * ```typescript
 * import { AgentBill } from '@/lib/agentbill-sdk';
 * import OpenAI from 'openai';
 * 
 * // Initialize with your API key
 * const agentBill = AgentBill.init({
 *   apiKey: 'your-api-key',
 *   customerId: 'customer-123',
 *   debug: true
 * });
 * 
 * // Wrap your OpenAI client
 * const openai = agentBill.wrapOpenAI(new OpenAI({
 *   apiKey: process.env.OPENAI_API_KEY
 * }));
 * 
 * // Use normally - all calls are automatically tracked!
 * const response = await openai.chat.completions.create({
 *   model: "gpt-4",
 *   messages: [{ role: "user", content: "Hello!" }]
 * });
 * ```
 */
export class AgentBill {
  private wrapper: AgentBillWrapper;

  private constructor(config: AgentBillConfig) {
    this.wrapper = new AgentBillWrapper(config);
  }

  /**
   * Initialize AgentBill SDK
   */
  static init(config: AgentBillConfig): AgentBill {
    return new AgentBill(config);
  }

  /**
   * Wrap an OpenAI client to automatically track usage
   */
  wrapOpenAI<T extends object>(client: T): T {
    return this.wrapper.wrapOpenAI(client);
  }

  /**
   * Wrap an Anthropic client to automatically track usage
   */
  wrapAnthropic<T extends object>(client: T): T {
    return this.wrapper.wrapAnthropic(client);
  }

  /**
   * Wrap an AWS Bedrock client to automatically track usage
   */
  wrapBedrock<T extends object>(client: T): T {
    return this.wrapper.wrapBedrock(client);
  }

  /**
   * Wrap an Azure OpenAI client to automatically track usage
   */
  wrapAzureOpenAI<T extends object>(client: T): T {
    return this.wrapper.wrapAzureOpenAI(client);
  }

  /**
   * Wrap a Mistral client to automatically track usage
   */
  wrapMistral<T extends object>(client: T): T {
    return this.wrapper.wrapMistral(client);
  }

  /**
   * Track a custom signal/event with revenue
   */
  async trackSignal(params: { event_name: string; revenue?: number; data?: Record<string, any> }): Promise<void> {
    const config = this.wrapper['config'];
    const url = `${config.baseUrl || 'https://bgwyprqxtdreuutzpbgw.supabase.co'}/functions/v1/record-signals`;
    
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_name: params.event_name,
          revenue: params.revenue || 0,
          customer_id: config.customerId,
          timestamp: Date.now(),
          data: params.data || {},
          data_source: 'sdk' // Mark as SDK integration
        })
      });
      
      if (config.debug) {
        console.log(`[AgentBill] Signal tracked: ${params.event_name}, revenue: $${params.revenue || 0}`);
      }
    } catch (error) {
      if (config.debug) {
        console.error('[AgentBill] Failed to track signal:', error);
      }
    }
  }

  /**
   * Flush any pending telemetry data
   */
  async flush(): Promise<void> {
    await this.wrapper.flush();
  }
}

// Export default instance
export default AgentBill;
