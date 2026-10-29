import { describe, expect, it } from 'vitest';
import { magicLink, signIn, signUp } from './auth';

describe('auth', () => {
  it('never stores the password in the clear and can sign back in', async () => {
    await signUp('Sam@Example.com', 'hunter2hunter2');
    const stored = localStorage.getItem('flowboard-users') ?? '';
    expect(stored).not.toContain('hunter2hunter2');
    expect(await signIn('sam@example.com', 'hunter2hunter2')).toBe('sam@example.com');
    await expect(signIn('sam@example.com', 'wrong-password')).rejects.toThrow('Invalid email or password.');
  });

  it('upgrades a legacy plaintext password to a hash on sign-in', async () => {
    localStorage.setItem('flowboard-users', JSON.stringify({ 'old@example.com': 'plain-secret' }));
    await signIn('old@example.com', 'plain-secret');
    expect(localStorage.getItem('flowboard-users')).not.toContain('plain-secret');
    await expect(signIn('old@example.com', 'plain-secret')).resolves.toBe('old@example.com');
  });

  it('does not let a magic link into a password-protected account', async () => {
    await signUp('sam@example.com', 'hunter2hunter2');
    expect(() => magicLink('SAM@example.com')).toThrow('Use the Password tab');
    expect(magicLink('new@example.com')).toBe('new@example.com');
  });

  it('handles prototype-polluting email values safely', async () => {
    await signUp('__proto__', 'hunter2hunter2');
    expect(({} as Record<string, unknown>).salt).toBeUndefined();
    await expect(signIn('__proto__', 'hunter2hunter2')).resolves.toBe('__proto__');
  });
});
