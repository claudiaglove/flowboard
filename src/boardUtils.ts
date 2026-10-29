import { COLUMNS, type CardData, type ColumnId } from './types';

export const isColumnId = (id: string): id is ColumnId => COLUMNS.some((c) => c.id === id);

/**
 * Move a card to `column`. With `beforeId` the card lands next to that card (after it
 * when dragged down within the same column, otherwise before it); without, at the end
 * of the column. Order within a column is the order of the cards array.
 */
export function placeCard(
  cards: CardData[],
  cardId: string,
  column: ColumnId,
  overId: string | null = null,
): CardData[] {
  const from = cards.findIndex((c) => c.id === cardId);
  if (from === -1 || overId === cardId) return cards;
  const moved: CardData = { ...cards[from], column };
  const rest = cards.filter((c) => c.id !== cardId);

  const overIndex = overId ? rest.findIndex((c) => c.id === overId) : -1;
  let at: number;
  if (overIndex !== -1) {
    const overOriginal = cards.findIndex((c) => c.id === overId);
    const sameColumnDown = cards[from].column === column && from < overOriginal;
    at = sameColumnDown ? overIndex + 1 : overIndex;
  } else {
    let last = -1;
    rest.forEach((c, i) => {
      if (c.column === column) last = i;
    });
    at = last === -1 ? rest.length : last + 1;
  }
  return [...rest.slice(0, at), moved, ...rest.slice(at)];
}
