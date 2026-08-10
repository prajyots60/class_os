import { describe, it, expect } from 'vitest';
import {
  AuthBranding,
  AuthHeader,
  AuthCard,
  AuthField,
  AuthError,
  AuthFooter,
  AuthLayoutShell,
} from '../index';

describe('Auth Foundation Components Verification', () => {
  it('Exports valid component functions for all auth foundation components', () => {
    expect(typeof AuthBranding).toBe('function');
    expect(typeof AuthHeader).toBe('function');
    expect(typeof AuthCard).toBe('function');
    expect(typeof AuthField).toBe('function');
    expect(typeof AuthError).toBe('function');
    expect(typeof AuthFooter).toBe('function');
    expect(typeof AuthLayoutShell).toBe('function');
  });

  it('AuthHeader produces defined JSX with custom title and description', () => {
    const header = AuthHeader({
      title: 'Sign In Test',
      description: 'Enter your credentials',
      eyebrow: 'Account Access',
    });
    expect(header).toBeDefined();
    expect(header.props.children).toBeDefined();
  });

  it('AuthField produces defined JSX with label and error props', () => {
    const field = AuthField({
      label: 'Email Address',
      htmlFor: 'email',
      error: 'Email is required',
      children: null,
    });
    expect(field).toBeDefined();
  });

  it('AuthError returns null when no message is provided', () => {
    const emptyError = AuthError({ message: null });
    expect(emptyError).toBeNull();
  });

  it('AuthError produces defined JSX when a valid public message is provided', () => {
    const errorAlert = AuthError({ message: 'Invalid email or password.' });
    expect(errorAlert).toBeDefined();
  });

  it('AuthFooter produces defined JSX with prompt and navigation props', () => {
    const footer = AuthFooter({
      prompt: "Don't have an account?",
      linkLabel: 'Sign Up',
      href: '/sign-up',
    });
    expect(footer).toBeDefined();
  });
});
