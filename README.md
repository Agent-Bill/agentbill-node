# @agentbill/sdk

OpenTelemetry-based SDK for automatic AI agent usage tracking and billing. Zero-config instrumentation for OpenAI, Anthropic, AWS Bedrock, Azure OpenAI, Mistral AI, and other AI providers.

## Features

✨ **Zero-config instrumentation** - Wrap your AI client once, track everything automatically  
📊 **Accurate token & cost tracking** - Captures real usage from API responses  
🔍 **OpenTelemetry standard** - Industry-standard observability protocol  
🚀 **Multi-provider support** - OpenAI, Anthropic, AWS Bedrock, Azure OpenAI, Mistral AI, Cohere, custom endpoints  
⚡ **Automatic batching** - Efficient data export with configurable batch sizes  
🎯 **Rich metadata** - Track model, tokens, latency, costs, and custom attributes  

## Supported Providers

### ✅ OpenAI
All GPT models (GPT-4, GPT-5, etc.) - Auto-captures tokens, model, cost, latency

### ✅ Anthropic  
All Claude models (Claude 3.5 Sonnet, Opus, etc.) - Auto-captures tokens, model, cost, latency

### ✅ AWS Bedrock
Claude, Meta Llama, Mistral, Amazon Titan, Cohere models - Auto-captures tokens, model, cost, latency

### ✅ Azure OpenAI
All Azure-deployed OpenAI models (GPT-4, GPT-3.5, embeddings) - Auto-captures tokens, model, cost, latency

### ✅ Mistral AI
Mistral Large/Medium/Small, Codestral, Ministral, open models - Auto-captures tokens, model, cost, latency

## Installation

### From GitHub (Recommended)
```bash
npm install github:YOUR-ORG/agentbill-typescript
# or
yarn add github:YOUR-ORG/agentbill-typescript
# or
pnpm add github:YOUR-ORG/agentbill-typescript
```

### From npm
```bash
npm install @agentbill/sdk
# or
yarn add @agentbill/sdk
# or
pnpm add @agentbill/sdk
```

### From Source
```bash
git clone https://github.com/YOUR-ORG/agentbill-typescript.git
cd agentbill-typescript
npm install
npm run build
npm link
```

## File Structure

```
agentbill-typescript/
├── README.md
├── package.json
├── tsconfig.json
├── index.ts
├── tracer.ts
├── types.ts
├── wrapper.ts
└── examples/
    └── basic-usage.ts
```

## Quick Start

### OpenAI

```typescript
import { AgentBill } from '@agentbill/sdk';
import OpenAI from 'openai';

// Initialize AgentBill
const agentBill = AgentBill.init({
  apiKey: 'your-agentbill-api-key',
  customerId: 'customer-123',
  baseUrl: 'https://your-agentbill-instance.com', // Your AgentBill API endpoint
  debug: true // Enable debug logging (optional)
});

// Wrap your OpenAI client
const openai = agentBill.wrapOpenAI(new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}));

// Use normally - all calls automatically tracked!
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello!" }]
});

// Tokens, costs, and latency automatically captured ✨
```

### Anthropic

```typescript
import { AgentBill } from '@agentbill/sdk';
import Anthropic from '@anthropic-ai/sdk';

const agentBill = AgentBill.init({
  apiKey: 'your-agentbill-api-key',
  customerId: 'customer-123',
  baseUrl: 'https://your-agentbill-instance.com'
});

const anthropic = agentBill.wrapAnthropic(new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
}));

const response = await anthropic.messages.create({
  model: "claude-opus-4",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }]
});
```

### AWS Bedrock

```typescript
import { AgentBill } from '@agentbill/sdk';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const agentBill = AgentBill.init({
  apiKey: 'your-agentbill-api-key',
  customerId: 'customer-123'
});

const bedrock = agentBill.wrapBedrock(new BedrockRuntimeClient({
  region: 'us-east-1'
}));

const response = await bedrock.send(new InvokeModelCommand({
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hello!" }],
    max_tokens: 1024
  })
}));
```

### Azure OpenAI

```typescript
import { AgentBill } from '@agentbill/sdk';
import { AzureOpenAI } from '@azure/openai';

const agentBill = AgentBill.init({
  apiKey: 'your-agentbill-api-key',
  customerId: 'customer-123'
});

const azure = agentBill.wrapAzureOpenAI(new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: 'https://YOUR_RESOURCE.openai.azure.com',
  apiVersion: '2024-02-01'
}));

const response = await azure.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }]
});
```

### Mistral AI

```typescript
import { AgentBill } from '@agentbill/sdk';
import MistralClient from '@mistralai/mistralai';

const agentBill = AgentBill.init({
  apiKey: 'your-agentbill-api-key',
  customerId: 'customer-123'
});

const mistral = agentBill.wrapMistral(new MistralClient(
  process.env.MISTRAL_API_KEY
));

const response = await mistral.chat.complete({
  model: "mistral-large-latest",
  messages: [{ role: "user", content: "Hello!" }]
});
```

## Configuration

```typescript
interface AgentBillConfig {
  apiKey: string;          // Required: Your AgentBill API key
  baseUrl?: string;        // Optional: AgentBill endpoint (default: production)
  customerId?: string;     // Optional: Associate all calls with a customer
  debug?: boolean;         // Optional: Enable debug logging (default: false)
}
```

## What Gets Tracked

Every AI API call is automatically instrumented with:

- **Model information** - Provider, model name, version
- **Token usage** - Prompt tokens, completion tokens, total tokens
- **Cost calculation** - Real-time cost based on current pricing
- **Prompt tracking** - Full prompts hashed for profitability analysis
- **Performance metrics** - Request latency, timestamps
- **Status tracking** - Success/failure, error messages
- **OpenTelemetry context** - Full trace and span data

## Prompt Profitability Tracking

Track which prompts are profitable or costing you money:

```typescript
const agentBill = AgentBill.init({
  apiKey: 'your-key',
  customerId: 'customer-123'
});

const openai = agentBill.wrapOpenAI(new OpenAI());

// All automatically captured:
// ✅ Prompt text (hashed for privacy)
// ✅ Model and provider
// ✅ Token usage (input/output)
// ✅ API costs (auto-calculated)
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Your prompt here" }]
});

// Optional: Add revenue to calculate profit
await agentBill.trackSignal("ai_completion", 0.01);
```

**Dashboard shows:**
- Cost per prompt (auto-calculated)
- Revenue per prompt (if you set it)
- Net margin per prompt
- Execution count by prompt
- Most/least profitable prompts

## Data Export

The SDK automatically batches and exports telemetry data:

- **Batch size**: Up to 10 spans per export
- **Batch timeout**: Maximum 1 second between exports
- **Format**: OpenTelemetry Protocol (OTLP)
- **Endpoint**: POST to `/functions/v1/otel-collector`

## Manual Flush

```typescript
// Flush any pending telemetry data before shutdown
await agentBill.flush();
```

## Advanced Usage

### Custom Base URL

```typescript
const agentBill = AgentBill.init({
  apiKey: 'your-key',
  baseUrl: 'https://custom-agentbill.example.com'
});
```

### Per-Customer Tracking

```typescript
// Track different customers
const customerABill = AgentBill.init({
  apiKey: 'your-key',
  customerId: 'customer-a'
});

const customerBBill = AgentBill.init({
  apiKey: 'your-key',
  customerId: 'customer-b'
});
```

## TypeScript Support

Fully typed with TypeScript. All types are exported:

```typescript
import type { 
  AgentBillConfig, 
  TraceContext, 
  SpanData,
  AICallMetrics,
  SupportedProvider 
} from '@agentbill/sdk';
```

## Requirements

- Node.js 16+
- TypeScript 5.0+ (for TypeScript projects)
- OpenAI SDK 4.0+ (if using OpenAI)
- Anthropic SDK 0.9+ (if using Anthropic)

## License

MIT

## Support

For issues, questions, or feature requests, visit: https://github.com/yourusername/agentbill-sdk
