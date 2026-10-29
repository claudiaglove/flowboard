import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { CardData, ColumnId } from '../types';
import Card from './Card';
import plusIcon from '../assets/plus.svg';
import uploadIcon from '../assets/upload.svg';

interface Props {
  id: ColumnId;
  label: string;
  cards: CardData[];
  isOver: boolean;
  filtering: boolean;
  onMove: (cardId: string, column: ColumnId) => void;
  onEdit: (card: CardData) => void;
  onAdd: () => void;
}

export default function Column({ id, label, cards, isOver, filtering, onMove, onEdit, onAdd }: Props) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${label}, ${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`}
      className={`column${isOver ? ' over' : ''}`}
    >
      <div className="column-header">
        <h2>{label}</h2>
        <span className="count" aria-hidden="true">{cards.length}</span>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {cards.length === 0 ? (
          <div className="cards">
            <div className="empty">
              <img src={uploadIcon} alt="" width={24} height={24} />
              <p>{filtering ? 'No cards match your filters' : 'Drop a card here or add one below'}</p>
            </div>
          </div>
        ) : (
          // role="list" keeps list semantics in Safari, which drops them when list-style is none.
          <ul className="cards" role="list">
            {cards.map((card) => (
              <Card key={card.id} card={card} onEdit={onEdit} onMove={onMove} />
            ))}
          </ul>
        )}
      </SortableContext>
      <button className="add-card" data-add-column={id} onClick={onAdd}>
        <img src={plusIcon} alt="" width={16} height={16} />
        Add card
      </button>
    </section>
  );
}
