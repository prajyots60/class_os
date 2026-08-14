import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { Discount } from './discount.vo';

describe('Discount Value Object', () => {
  it('handles "none" discount type correctly', () => {
    const discount = Discount.create('none');
    expect(discount.type).toBe('none');
    expect(discount.value).toBe(0);
    expect(discount.calculateDiscount(10000)).toBe(0);
    expect(discount.calculateFinalAmount(10000)).toBe(10000);
  });

  it('calculates percentage discounts accurately', () => {
    const discount = Discount.create('percentage', 10);
    expect(discount.calculateDiscount(10000)).toBe(1000);
    expect(discount.calculateFinalAmount(10000)).toBe(9000);

    const discount25 = Discount.create('percentage', 25);
    expect(discount25.calculateDiscount(10000)).toBe(2500);
    expect(discount25.calculateFinalAmount(10000)).toBe(7500);
  });

  it('calculates fixed discounts accurately', () => {
    const discount = Discount.create('fixed', 500);
    expect(discount.calculateDiscount(10000)).toBe(500);
    expect(discount.calculateFinalAmount(10000)).toBe(9500);
  });

  it('rejects percentage discount > 100%', () => {
    expect(() => Discount.create('percentage', 101)).toThrow(ValidationError);
  });

  it('rejects negative discount values', () => {
    expect(() => Discount.create('percentage', -10)).toThrow(ValidationError);
    expect(() => Discount.create('fixed', -100)).toThrow(ValidationError);
  });

  it('rejects fixed discount exceeding base amount', () => {
    const discount = Discount.create('fixed', 15000);
    expect(() => discount.calculateDiscount(10000)).toThrow(ValidationError);
  });
});
