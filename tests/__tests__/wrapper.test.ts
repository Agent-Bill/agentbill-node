import { AgentBillWrapper } from '../../src/wrapper';
import { AgentBillConfig } from '../../src/types';

describe('AgentBillWrapper', () => {
  const mockConfig: AgentBillConfig = {
    apiKey: 'test-api-key',
    customerId: 'test-customer-id',
    debug: false,
  };

  let wrapper: AgentBillWrapper;

  beforeEach(() => {
    wrapper = new AgentBillWrapper(mockConfig);
  });

  it('should initialize correctly with valid config', () => {
    expect(wrapper).toBeInstanceOf(AgentBillWrapper);
  });

  it('should have wrapOpenAI method', () => {
    expect(typeof wrapper.wrapOpenAI).toBe('function');
  });

  it('should have wrapAnthropic method', () => {
    expect(typeof wrapper.wrapAnthropic).toBe('function');
  });

  it('should throw error for undefined client', () => {
    expect(() => wrapper.wrapOpenAI(undefined as any)).toThrow();
  });
});