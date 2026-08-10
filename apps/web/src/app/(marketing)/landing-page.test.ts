import { describe, it, expect } from 'vitest';
import MarketingHomePage from './page';
import MarketingLayout from './layout';

describe('Landing Page Audit & Verification', () => {
  it('MarketingHomePage and MarketingLayout export valid component functions', () => {
    expect(typeof MarketingHomePage).toBe('function');
    expect(typeof MarketingLayout).toBe('function');
  });

  it('MarketingHomePage composes without errors', () => {
    const pageElement = MarketingHomePage();
    expect(pageElement).toBeDefined();
  });
});
