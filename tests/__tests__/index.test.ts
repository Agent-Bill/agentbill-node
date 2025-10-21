import { AgentBill } from '../../src/index';
import { AgentBillConfig } from '../../src/types';

describe('AgentBill SDK', () => {
  const mockConfig: AgentBillConfig = {
    apiKey: 'test-api-key',
    customerId: 'test-customer-id',
    debug: false,
  };

  it('should initialize AgentBill SDK', () => {
    const agentBill = AgentBill.init(mockConfig);
    expect(agentBill).toBeDefined();
    expect(typeof agentBill.wrapOpenAI).toBe('function');
    expect(typeof agentBill.trackSignal).toBe('function');
  });

  it('should export AgentBillWrapper', () => {
    const { AgentBillWrapper } = require('../../src/index');
    expect(AgentBillWrapper).toBeDefined();
  });

  it('should export AgentBillTracer', () => {
    const { AgentBillTracer } = require('../../src/index');
    expect(AgentBillTracer).toBeDefined();
  });
});