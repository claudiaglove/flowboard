import { describe, expect, it } from 'vitest';
import { PAGE_META, applyPageMeta } from './seo';

const meta = (name: string) => document.head.querySelectorAll(`meta[name="${name}"]`);

describe('applyPageMeta', () => {
  it('makes the sign-in view indexable with a descriptive title and description', () => {
    applyPageMeta(PAGE_META.signedOut);
    expect(document.title).toBe('Sign in to FlowBoard – Kanban board for small teams');
    expect(meta('description')[0]).toHaveAttribute('content', expect.stringContaining('Kanban board'));
    expect(meta('robots')[0].getAttribute('content')).toContain('index, follow');
  });

  it('marks the signed-in board noindex and reuses the same tags', () => {
    applyPageMeta(PAGE_META.signedOut);
    applyPageMeta(PAGE_META.signedIn);
    expect(document.title).toBe('Team Board – FlowBoard');
    expect(meta('robots')).toHaveLength(1);
    expect(meta('robots')[0]).toHaveAttribute('content', 'noindex, nofollow');
    expect(meta('description')).toHaveLength(1);
  });

  it('keeps titles within search-result length and the description under 160 characters', () => {
    expect(PAGE_META.signedOut.title.length).toBeLessThanOrEqual(60);
    expect(PAGE_META.signedOut.description.length).toBeLessThanOrEqual(160);
  });
});
