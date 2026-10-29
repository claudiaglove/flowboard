import { describe, expect, it } from 'vitest';
import { placeCard } from './boardUtils';
import type { CardData } from './types';

const card = (id: string, column: CardData['column']): CardData => ({
  id, title: id, assignee: 'a', priority: 'Low', dueDate: '2030-01-01', column,
});
const ids = (cards: CardData[]) => cards.map((c) => c.id);

describe('placeCard', () => {
  const cards = [card('a', 'backlog'), card('b', 'backlog'), card('c', 'backlog'), card('d', 'done')];

  it('moves down within a column to just after the target', () => {
    expect(ids(placeCard(cards, 'a', 'backlog', 'b'))).toEqual(['b', 'a', 'c', 'd']);
  });

  it('moves up within a column to just before the target', () => {
    expect(ids(placeCard(cards, 'c', 'backlog', 'a'))).toEqual(['c', 'a', 'b', 'd']);
  });

  it('moves across columns before the target card', () => {
    const next = placeCard(cards, 'a', 'done', 'd');
    expect(ids(next)).toEqual(['b', 'c', 'a', 'd']);
    expect(next.find((c) => c.id === 'a')?.column).toBe('done');
  });

  it('appends to the end of a column when dropped on the column', () => {
    expect(ids(placeCard(cards, 'a', 'done'))).toEqual(['b', 'c', 'd', 'a']);
  });

  it('ignores a drop on itself and unknown ids', () => {
    expect(placeCard(cards, 'a', 'backlog', 'a')).toBe(cards);
    expect(placeCard(cards, 'zzz', 'done')).toBe(cards);
  });
});
