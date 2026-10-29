import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { COLUMNS, type CardData, type ColumnId } from '../types';
import { formatDue, isOverdue } from '../dates';

interface Props {
  card: CardData;
  onEdit: (card: CardData) => void;
  onMove: (cardId: string, column: ColumnId) => void;
}

interface BodyProps {
  card: CardData;
  onOpen?: (card: CardData) => void;
  onMove?: (cardId: string, column: ColumnId) => void;
}

// The title is the card's one "open" control (a real button stretched over the card with CSS);
// the Move select is a sibling of it rather than nested inside another control.
export function CardBody({ card, onOpen, onMove }: BodyProps) {
  const overdue = isOverdue(card.dueDate, card.column === 'done');
  return (
    <>
      <div className="card-title">
        {onOpen ? (
          <button type="button" className="card-open" data-card-open={card.id} onClick={() => onOpen(card)}>
            {card.title}
          </button>
        ) : (
          card.title
        )}
      </div>
      <div className="card-meta">
        <span className={`badge ${card.priority.toLowerCase()}`}>{card.priority}</span>
        <span>{card.assignee}</span>
        <time dateTime={card.dueDate} className={overdue ? 'overdue' : undefined}>
          {formatDue(card.dueDate)}
          {overdue && ' · Overdue'}
        </time>
      </div>
      {onMove && (
        <select
          className="card-move"
          data-card-move={card.id}
          aria-label={`Move "${card.title}" to column`}
          value={card.column}
          // Keep the select from starting a drag.
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onChange={(e) => onMove(card.id, e.target.value as ColumnId)}
        >
          {COLUMNS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      )}
    </>
  );
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Card({ card, onEdit, onMove }: Props) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  return (
    <li
      ref={setNodeRef}
      className={`card${isDragging ? ' dragging' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: prefersReducedMotion() ? undefined : transition,
      }}
      {...listeners}
    >
      <CardBody card={card} onOpen={onEdit} onMove={onMove} />
    </li>
  );
}
