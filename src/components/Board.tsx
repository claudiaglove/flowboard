import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { COLUMNS, PRIORITIES, type CardData, type ColumnId, type Priority } from '../types';
import { isColumnId, placeCard } from '../boardUtils';
import Column from './Column';
import CardModal from './CardModal';
import { CardBody } from './Card';

const LEGACY_KEY = 'team-kanban-cards';
const storageKey = (user: string) => `${LEGACY_KEY}:${user}`;
// Long enough to find and press Undo with a keyboard or screen reader; paused while it has hover or focus.
const UNDO_MS = 20000;

const labelOfColumn = (id: ColumnId) => COLUMNS.find((c) => c.id === id)?.label ?? id;
const openSelector = (cardId: string) => `[data-card-open="${cardId}"]`;
const moveSelector = (cardId: string) => `[data-card-move="${cardId}"]`;
const addSelector = (column: ColumnId) => `[data-add-column="${column}"]`;

interface Loaded {
  cards: CardData[];
  error: string | null;
}

function loadCards(user: string): Loaded {
  const key = storageKey(user);
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
    if (raw === null) {
      // Boards used to be shared by everyone on the browser: the first person in adopts it.
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy !== null) {
        raw = legacy;
        localStorage.setItem(key, legacy);
        localStorage.removeItem(LEGACY_KEY);
      }
    }
    return { cards: raw ? (JSON.parse(raw) as CardData[]) : [], error: null };
  } catch {
    // Keep the unreadable data around instead of letting the first save overwrite it.
    try {
      if (raw) localStorage.setItem(`${key}-corrupt`, raw);
    } catch {
      /* storage unavailable; nothing more we can do */
    }
    return { cards: [], error: "Your saved cards couldn't be read, so the board was reset." };
  }
}

type ModalState = { card: CardData | null; column: ColumnId } | null;
type Deleted = { card: CardData; index: number } | null;

export default function Board({ user }: { user: string }) {
  const [initial] = useState(() => loadCards(user));
  const [cards, setCards] = useState<CardData[]>(initial.cards);
  const [notice, setNotice] = useState<string | null>(initial.error);
  const [modal, setModal] = useState<ModalState>(null);
  const [deleted, setDeleted] = useState<Deleted>(null);
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ColumnId | null>(null);
  const [message, setMessage] = useState('');
  const undoTimer = useRef<number>();

  // Where focus goes after the next render: the element that opened the dialog if it is still
  // on the page, otherwise the explicit selector (e.g. the neighbour of a deleted card).
  const opener = useRef<HTMLElement | null>(null);
  const restoreOpener = useRef(false);
  const focusAfter = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // A short press-and-hold on touch screens, so swiping still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(user), JSON.stringify(cards));
    } catch {
      setNotice("Your changes couldn't be saved in this browser and may be lost on reload.");
    }
  }, [cards, user]);

  useEffect(() => () => window.clearTimeout(undoTimer.current), []);

  useEffect(() => {
    if (modal) return;
    const target = focusAfter.current ? document.querySelector<HTMLElement>(focusAfter.current) : null;
    const back = restoreOpener.current && opener.current?.isConnected ? opener.current : null;
    focusAfter.current = null;
    restoreOpener.current = false;
    (back ?? target)?.focus();
  });

  const filtering = query.trim() !== '' || priority !== '';
  const needle = query.trim().toLowerCase();
  const visible = cards.filter(
    (c) =>
      (!priority || c.priority === priority) &&
      (!needle || c.title.toLowerCase().includes(needle) || c.assignee.toLowerCase().includes(needle)),
  );

  const openModal = (next: NonNullable<ModalState>) => {
    opener.current = document.activeElement as HTMLElement | null;
    setModal(next);
  };
  const closeModal = () => {
    restoreOpener.current = true;
    setModal(null);
  };

  const moveFromSelect = (id: string, column: ColumnId) => {
    const card = cards.find((c) => c.id === id);
    if (!card || card.column === column) return;
    setCards((prev) => placeCard(prev, id, column));
    // The card remounts in its new column; put focus back on its Move control and say what happened.
    focusAfter.current = moveSelector(id);
    setMessage(`Moved “${card.title}” to ${labelOfColumn(column)}.`);
  };

  const columnOf = (id: string): ColumnId | null =>
    isColumnId(id) ? id : (cards.find((c) => c.id === id)?.column ?? null);
  const titleOf = (id: string | number) => cards.find((c) => c.id === String(id))?.title ?? 'card';

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up “${titleOf(active.id)}”.`,
    onDragOver: ({ active, over }) => {
      const column = over ? columnOf(String(over.id)) : null;
      return column ? `“${titleOf(active.id)}” is over ${labelOfColumn(column)}.` : undefined;
    },
    onDragEnd: ({ active, over }) => {
      const column = over ? columnOf(String(over.id)) : null;
      return column ? `Dropped “${titleOf(active.id)}” in ${labelOfColumn(column)}.` : `“${titleOf(active.id)}” was not moved.`;
    },
    onDragCancel: ({ active }) => `Dragging cancelled. “${titleOf(active.id)}” was not moved.`,
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragOver = (e: DragOverEvent) => setOverColumn(e.over ? columnOf(String(e.over.id)) : null);
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    setOverColumn(null);
    if (!e.over) return;
    const overId = String(e.over.id);
    const column = columnOf(overId);
    if (column) setCards((prev) => placeCard(prev, String(e.active.id), column, isColumnId(overId) ? null : overId));
  };

  const startUndoTimer = () => {
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setDeleted(null), UNDO_MS);
  };
  const pauseUndoTimer = () => window.clearTimeout(undoTimer.current);

  const deleteCard = (id: string) => {
    const index = cards.findIndex((c) => c.id === id);
    if (index === -1) return;
    const card = cards[index];
    // Focus the card next to the deleted one (or the column's Add button) so it isn't lost.
    const siblings = visible.filter((c) => c.column === card.column);
    const at = siblings.findIndex((c) => c.id === id);
    const neighbour = siblings[at + 1] ?? siblings[at - 1];
    focusAfter.current = neighbour ? openSelector(neighbour.id) : addSelector(card.column);
    restoreOpener.current = true;
    setDeleted({ card, index });
    setCards((prev) => prev.filter((c) => c.id !== id));
    setModal(null);
    startUndoTimer();
  };

  const undoDelete = () => {
    if (!deleted) return;
    const { card, index } = deleted;
    setCards((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, card);
      return next;
    });
    focusAfter.current = openSelector(card.id);
    setMessage(`Restored “${card.title}”.`);
    pauseUndoTimer();
    setDeleted(null);
  };

  // Ctrl/Cmd+Z undoes a delete for keyboard users, unless they are typing in a field.
  useEffect(() => {
    if (!deleted) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        undoDelete();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const saveCard = (data: Omit<CardData, 'id'>) => {
    const existing = modal?.card;
    const id = existing?.id ?? crypto.randomUUID();
    if (existing) {
      setCards((prev) => prev.map((c) => (c.id === existing.id ? { ...c, ...data } : c)));
    } else {
      setCards((prev) => [...prev, { ...data, id }]);
    }
    focusAfter.current = openSelector(id);
    restoreOpener.current = true;
    setModal(null);
  };

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : undefined;

  return (
    <main id="board" tabIndex={-1}>
      <div className="subnav">
        <span className="crumb">Boards</span>
        <span className="crumb-sep" aria-hidden="true">/</span>
        <h1>Team Board</h1>
        <span className="crumb-meta">{COLUMNS.length} columns</span>
      </div>
      <div className="toolbar" role="search" aria-label="Filter cards">
        <label className="tool">
          <span className="tool-label">Search</span>
          <input
            type="search"
            className="search"
            placeholder="Title or assignee"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="tool">
          <span className="tool-label">Priority</span>
          <select className="filter" value={priority} onChange={(e) => setPriority(e.target.value as Priority | '')}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        {filtering && (
          <>
            <span className="crumb-meta">
              {visible.length} of {cards.length} {cards.length === 1 ? 'card' : 'cards'}
            </span>
            <button type="button" className="link" onClick={() => { setQuery(''); setPriority(''); }}>
              Clear filters
            </button>
          </>
        )}
      </div>
      {/* Persistent live regions: text added to an existing region is announced reliably. */}
      <div className="sr-only" role="status">
        {filtering ? `${visible.length} of ${cards.length} cards shown` : ''}
      </div>
      <div className="sr-only" role="status">{message}</div>
      {notice && (
        <div className="banner" role="alert">
          <span>{notice}</span>
          <button type="button" className="link" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}
      {cards.length === 0 && (
        <div className="welcome">
          <div>
            <h2>Welcome to your board</h2>
            <p>Add your first card, then drag it between columns as the work moves along.</p>
          </div>
          <button type="button" className="btn primary" onClick={() => openModal({ card: null, column: 'backlog' })}>
            Add your first card
          </button>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{ announcements }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setOverColumn(null);
        }}
      >
        <div className="board">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              label={col.label}
              cards={visible.filter((c) => c.column === col.id)}
              isOver={overColumn === col.id}
              filtering={filtering}
              onMove={moveFromSelect}
              onEdit={(card) => openModal({ card, column: card.column })}
              onAdd={() => openModal({ card: null, column: col.id })}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard && (
            <div className="card overlay-card">
              <CardBody card={activeCard} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <div className="toast-region" role="status">
        {deleted && (
          <div
            className="toast"
            onMouseEnter={pauseUndoTimer}
            onMouseLeave={startUndoTimer}
            onFocus={pauseUndoTimer}
            onBlur={startUndoTimer}
          >
            <span>Deleted “{deleted.card.title}”</span>
            <button type="button" aria-keyshortcuts="Control+Z Meta+Z" onClick={undoDelete}>Undo</button>
          </div>
        )}
      </div>
      {modal && (
        <CardModal
          card={modal.card}
          column={modal.column}
          onSave={saveCard}
          onDelete={deleteCard}
          onClose={closeModal}
        />
      )}
    </main>
  );
}
