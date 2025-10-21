// AgentBill SDK TypeScript Types

export interface AgentBillConfig {
  apiKey: string;
  baseUrl?: string;
  customerId?: string;
  debug?: boolean;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  customerId?: string;
}

export interface SpanData {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: 'client' | 'server' | 'internal';
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Array<{ key: string; value: any }>;
  status?: { code: number; message?: string };
  events?: Array<any>;
}

export interface OtelExportPayload {
  resourceSpans: Array<{
    resource: {
      attributes: Array<{ key: string; value: any }>;
    };
    scopeSpans: Array<{
      scope: { name: string; version: string };
      spans: SpanData[];
    }>;
  }>;
}

export interface AICallMetrics {
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  cost?: number;
  prompt?: string;
}

export type SupportedProvider = 'openai' | 'anthropic' | 'cohere' | 'bedrock' | 'azure_openai' | 'mistral' | 'custom';
