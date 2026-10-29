// Client-side demo auth: no backend, so accounts and the session live in localStorage.
// Passwords are never stored in the clear: each one is salted and run through PBKDF2.
// This protects people who reuse a password elsewhere; it is not a substitute for a server.
const USERS_KEY = 'flowboard-users';
const SESSION_KEY = 'flowboard-session';
const ITERATIONS = 210_000;

interface PasswordHash {
  salt: string;
  hash: string;
  iterations: number;
}
// Older versions stored the password itself as a string; those are upgraded on next sign-in.
type Stored = PasswordHash | string;
type Users = Map<string, Stored>;

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return toB64(new Uint8Array(bits));
}

async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toB64(salt), hash: await derive(password, salt, ITERATIONS), iterations: ITERATIONS };
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function matches(stored: Stored, password: string): Promise<boolean> {
  if (typeof stored === 'string') return sameString(stored, password);
  return sameString(stored.hash, await derive(password, fromB64(stored.salt), stored.iterations));
}

// A Map keeps odd keys such as "__proto__" from touching the object prototype.
function readUsers(): Users {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(USERS_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? new Map(Object.entries(parsed)) : new Map();
  } catch {
    return new Map();
  }
}

function writeUsers(users: Users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(Object.fromEntries(users)));
}

export function getSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function startSession(email: string): string {
  localStorage.setItem(SESSION_KEY, email);
  return email;
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

export async function signUp(email: string, password: string): Promise<string> {
  const key = email.toLowerCase();
  const users = readUsers();
  if (users.has(key)) throw new Error('An account with this email already exists.');
  users.set(key, await hashPassword(password));
  writeUsers(users);
  return startSession(key);
}

export async function signIn(email: string, password: string): Promise<string> {
  const key = email.toLowerCase();
  const users = readUsers();
  const stored = users.get(key);
  if (stored === undefined || !(await matches(stored, password))) {
    throw new Error('Invalid email or password.');
  }
  if (typeof stored === 'string') {
    users.set(key, await hashPassword(password));
    writeUsers(users);
  }
  return startSession(key);
}

// Demo only: there is no email delivery, so a "magic link" signs the address in directly.
// It must never be a way into an account that is protected by a password.
export function magicLink(email: string): string {
  const key = email.toLowerCase();
  if (readUsers().has(key)) {
    throw new Error('This email has a password. Use the Password tab to sign in.');
  }
  return startSession(key);
}
