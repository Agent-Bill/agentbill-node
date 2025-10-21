import { AgentBill } from '@agentbill/sdk';

// Initialize AgentBill
const agentBill = AgentBill.init({
  apiKey: 'your-agentbill-api-key',
  customerId: 'customer-123',
  debug: true
});

// Example: Track a custom event
async function trackCustomEvent() {
  await agentBill.trackSignal({
    event_name: 'user_action',
    revenue: 10.50,
    data: { action: 'premium_feature_used' }
  });
}

trackCustomEvent().catch(console.error);