import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { COLUMNS, PRIORITIES, type CardData, type ColumnId, type Priority } from '../types';
import close1 from '../assets/close-1.svg';
import close2 from '../assets/close-2.svg';

interface Props {
  card: CardData | null;
  column: ColumnId;
  onSave: (data: Omit<CardData, 'id'>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

type Errors = Partial<Record<'title' | 'assignee' | 'dueDate', string>>;

const FOCUSABLE = 'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])';

export default function CardModal({ card, column: initialColumn, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(card?.title ?? '');
  const [assignee, setAssignee] = useState(card?.assignee ?? '');
  const [priority, setPriority] = useState<Priority>(card?.priority ?? 'Medium');
  const [dueDate, setDueDate] = useState(card?.dueDate ?? '');
  const [column, setColumn] = useState<ColumnId>(initialColumn);
  const [errors, setErrors] = useState<Errors>({});
  const dialogRef = useRef<HTMLFormElement>(null);
  const pressedOnOverlay = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // The dialog is portalled out of #root so the page behind it can be made inert:
  // not focusable, not clickable and hidden from assistive technology.
  useEffect(() => {
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    return () => root?.removeAttribute('inert');
  }, []);

  // Escape and the Tab trap live on the document so they still work when focus has
  // landed on the dialog itself or on the backdrop rather than on a field.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      const dialog = dialogRef.current;
      if (e.key !== 'Tab' || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled'),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!title.trim()) next.title = 'Enter a card name.';
    if (!assignee.trim()) next.assignee = 'Enter who is responsible.';
    if (!dueDate) next.dueDate = 'Pick a due date.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      dialogRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    onSave({ title: title.trim(), assignee: assignee.trim(), priority, dueDate, column });
  };

  return createPortal(
    <div
      className="overlay"
      onMouseDown={(e) => {
        pressedOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Only close when the press and release both happened on the backdrop,
        // so dragging a text selection out of the dialog doesn't discard edits.
        if (pressedOnOverlay.current && e.target === e.currentTarget) onClose();
        pressedOnOverlay.current = false;
      }}
    >
      <form
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
        tabIndex={-1}
        noValidate
        onSubmit={submit}
      >
        <div className="modal-header">
          <h2 id="card-modal-title">{card ? 'Edit card' : 'New card'}</h2>
          <button type="button" className="close" aria-label="Close" onClick={onClose}>
            <img src={close1} alt="" />
            <img src={close2} alt="" />
          </button>
        </div>
        <p className="hint">All fields are required.</p>
        <div className="field">
          <label className="label" htmlFor="f-title">Name</label>
          <input
            id="f-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter card name..."
            aria-required="true"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? 'err-title' : undefined}
            autoFocus
          />
          {errors.title && <span id="err-title" className="field-error">{errors.title}</span>}
        </div>
        <div className="field">
          <label className="label small" htmlFor="f-assignee">Assignee</label>
          <input
            id="f-assignee"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Who is responsible?"
            aria-required="true"
            aria-invalid={errors.assignee ? true : undefined}
            aria-describedby={errors.assignee ? 'err-assignee' : undefined}
          />
          {errors.assignee && <span id="err-assignee" className="field-error">{errors.assignee}</span>}
        </div>
        <div className="row">
          <div className="field">
            <label className="label small" htmlFor="f-priority">Priority</label>
            <select id="f-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label small" htmlFor="f-due">Due date</label>
            <input
              id="f-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-required="true"
              aria-invalid={errors.dueDate ? true : undefined}
              aria-describedby={errors.dueDate ? 'err-due' : undefined}
            />
            {errors.dueDate && <span id="err-due" className="field-error">{errors.dueDate}</span>}
          </div>
        </div>
        <div className="field">
          <label className="label small" htmlFor="f-status">Status</label>
          <select id="f-status" value={column} onChange={(e) => setColumn(e.target.value as ColumnId)}>
            {COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="modal-footer">
          {card ? (
            <button type="button" className="delete" onClick={() => onDelete(card.id)}>
              Delete card
            </button>
          ) : (
            <span />
          )}
          <div className="footer-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">Save</button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}
