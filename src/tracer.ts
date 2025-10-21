// OpenTelemetry Tracer for AgentBill SDK
import { AgentBillConfig, SpanData, OtelExportPayload, TraceContext } from './types';

export class AgentBillTracer {
  private config: AgentBillConfig;
  private activeSpans: Map<string, SpanData> = new Map();
  private pendingExports: SpanData[] = [];
  private exportTimer: NodeJS.Timeout | null = null;

  constructor(config: AgentBillConfig) {
    this.config = config;
    this.log('Tracer initialized', { baseUrl: config.baseUrl });
  }

  private log(message: string, data?: any) {
    if (this.config.debug) {
      console.log(`[AgentBill] ${message}`, data || '');
    }
  }

  generateTraceId(): string {
    return this.generateId(32);
  }

  generateSpanId(): string {
    return this.generateId(16);
  }

  private generateId(length: number): string {
    const bytes = new Uint8Array(length / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  startSpan(name: string, traceContext?: TraceContext): TraceContext {
    const traceId = traceContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const startTime = Date.now();

    const span: SpanData = {
      traceId,
      spanId,
      parentSpanId: traceContext?.spanId,
      name,
      kind: 'client',
      startTimeUnixNano: (startTime * 1000000).toString(),
      endTimeUnixNano: '', // Will be set when span ends
      attributes: [],
      events: [],
    };

    this.activeSpans.set(spanId, span);
    this.log('Span started', { spanId, name });

    return {
      traceId,
      spanId,
      customerId: traceContext?.customerId || this.config.customerId,
    };
  }

  setSpanAttribute(spanId: string, key: string, value: any) {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.attributes.push({
        key,
        value: this.encodeValue(value),
      });
    }
  }

  setSpanStatus(spanId: string, code: number, message?: string) {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.status = { code, message };
    }
  }

  endSpan(spanId: string) {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTimeUnixNano = (Date.now() * 1000000).toString();
    
    this.activeSpans.delete(spanId);
    this.pendingExports.push(span);

    this.log('Span ended', { spanId, name: span.name });

    // Schedule export (batch multiple spans)
    this.scheduleExport();
  }

  private scheduleExport() {
    if (this.exportTimer) {
      clearTimeout(this.exportTimer);
    }

    // Export after 1 second or when 10 spans are collected
    if (this.pendingExports.length >= 10) {
      this.exportSpans();
    } else {
      this.exportTimer = setTimeout(() => this.exportSpans(), 1000);
    }
  }

  private async exportSpans() {
    if (this.pendingExports.length === 0) return;

    const spans = [...this.pendingExports];
    this.pendingExports = [];

    const payload: OtelExportPayload = {
      resourceSpans: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'agentbill-sdk' } },
            { key: 'service.version', value: { stringValue: '1.0.0' } },
            ...(this.config.customerId 
              ? [{ key: 'customer.id', value: { stringValue: this.config.customerId } }]
              : []
            ),
          ],
        },
        scopeSpans: [{
          scope: {
            name: 'agentbill-instrumentation',
            version: '1.0.0',
          },
          spans,
        }],
      }],
    };

    this.log('Exporting spans', { count: spans.length });

    try {
      const baseUrl = this.config.baseUrl || 'https://uenhjwdtnxtchlmqarjo.supabase.co';
      const response = await fetch(`${baseUrl}/functions/v1/otel-collector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[AgentBill] Export failed:', error);
      } else {
        const result = await response.json();
        this.log('Export successful', result);
      }
    } catch (error) {
      console.error('[AgentBill] Export error:', error);
    }
  }

  private encodeValue(value: any): any {
    if (typeof value === 'string') {
      return { stringValue: value };
    } else if (typeof value === 'number') {
      return Number.isInteger(value) 
        ? { intValue: value }
        : { doubleValue: value };
    } else if (typeof value === 'boolean') {
      return { boolValue: value };
    }
    return { stringValue: String(value) };
  }

  async flush() {
    if (this.exportTimer) {
      clearTimeout(this.exportTimer);
    }
    await this.exportSpans();
  }
}
