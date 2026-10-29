import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Board from './components/Board';

const cardsKey = (user: string) => `team-kanban-cards:${user}`;

async function addCard(user: ReturnType<typeof userEvent.setup>, name: string, column = 'Backlog') {
  const col = screen.getByRole('region', { name: new RegExp(`^${column},`) });
  await user.click(within(col).getByRole('button', { name: 'Add card' }));
  await user.type(screen.getByLabelText('Name'), name);
  await user.type(screen.getByLabelText('Assignee'), 'Sam');
  await user.type(screen.getByLabelText('Due date'), '2030-05-01');
  await user.click(screen.getByRole('button', { name: 'Save' }));
}

describe('Board', () => {
  it('shows the welcome state, then creates a card', async () => {
    const user = userEvent.setup();
    render(<Board user="a@x.com" />);
    expect(screen.getByText('Welcome to your board')).toBeInTheDocument();
    await addCard(user, 'Write docs');
    expect(screen.queryByText('Welcome to your board')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Write docs/ })).toBeInTheDocument();
  });

  it('rejects a whitespace-only name with an inline error', async () => {
    const user = userEvent.setup();
    render(<Board user="a@x.com" />);
    await user.click(screen.getAllByRole('button', { name: 'Add card' })[0]);
    await user.type(screen.getByLabelText('Name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Enter a card name.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the dialog with Escape and returns focus to the card', async () => {
    const user = userEvent.setup();
    render(<Board user="a@x.com" />);
    await addCard(user, 'Write docs');
    const card = screen.getByRole('button', { name: /^Write docs/ });
    card.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Edit card' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(card).toHaveFocus();
  });

  it('moves a card with the Move to select', async () => {
    const user = userEvent.setup();
    render(<Board user="a@x.com" />);
    await addCard(user, 'Write docs');
    await user.selectOptions(screen.getByLabelText('Move "Write docs" to column'), 'Done');
    const done = screen.getByRole('region', { name: /^Done,/ });
    expect(within(done).getByRole('button', { name: /^Write docs/ })).toBeInTheDocument();
  });

  it('deletes a card and restores it with Undo', async () => {
    const user = userEvent.setup();
    render(<Board user="a@x.com" />);
    await addCard(user, 'Write docs');
    await user.click(screen.getByRole('button', { name: /^Write docs/ }));
    await user.click(screen.getByRole('button', { name: 'Delete card' }));
    expect(screen.queryByRole('button', { name: /^Write docs/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: /^Write docs/ })).toBeInTheDocument();
  });

  it('filters by search text', async () => {
    const user = userEvent.setup();
    render(<Board user="a@x.com" />);
    await addCard(user, 'Write docs');
    await addCard(user, 'Fix bug');
    await user.type(screen.getByLabelText('Search'), 'bug');
    expect(screen.queryByRole('button', { name: /^Write docs/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Fix bug/ })).toBeInTheDocument();
  });

  it('keeps a separate board per user and adopts the legacy shared board once', () => {
    localStorage.setItem('team-kanban-cards', JSON.stringify([
      { id: '1', title: 'Legacy card', assignee: 'a', priority: 'Low', dueDate: '2030-01-01', column: 'backlog' },
    ]));
    const first = render(<Board user="a@x.com" />);
    expect(screen.getByRole('button', { name: /^Legacy card/ })).toBeInTheDocument();
    expect(localStorage.getItem('team-kanban-cards')).toBeNull();
    first.unmount();
    render(<Board user="b@x.com" />);
    expect(screen.queryByRole('button', { name: /^Legacy card/ })).not.toBeInTheDocument();
  });

  it('keeps unreadable saved data and tells the user', () => {
    localStorage.setItem(cardsKey('a@x.com'), '{not json');
    render(<Board user="a@x.com" />);
    expect(screen.getByRole('alert')).toHaveTextContent("couldn't be read");
    expect(localStorage.getItem(`${cardsKey('a@x.com')}-corrupt`)).toBe('{not json');
  });

  it('warns when saving fails', async () => {
    const user = userEvent.setup();
    render(<Board user="a@x.com" />);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    await addCard(user, 'Write docs');
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't be saved");
    vi.restoreAllMocks();
  });
  it('moves focus to the neighbouring card after a delete, or to Add card when none is left', async () => {
    const user = userEvent.setup();
    render(<Board user="a@x.com" />);
    await addCard(user, 'First');
    await addCard(user, 'Second');
    await user.click(screen.getByRole('button', { name: 'First' }));
    await user.click(screen.getByRole('button', { name: 'Delete card' }));
    expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Second' }));
    await user.click(screen.getByRole('button', { name: 'Delete card' }));
    const backlog = screen.getByRole('region', { name: /^Backlog,/ });
    expect(within(backlog).getByRole('button', { name: 'Add card' })).toHaveFocus();
  });

  it('keeps focus on the Move control after moving a card and announces it', async () => {
    const user = userEvent.setup();
    render(<Board user="a@x.com" />);
    await addCard(user, 'Write docs');
    await user.selectOptions(screen.getByLabelText('Move "Write docs" to column'), 'Done');
    expect(screen.getByLabelText('Move "Write docs" to column')).toHaveFocus();
    expect(screen.getByText('Moved “Write docs” to Done.')).toBeInTheDocument();
  });

  it('undoes a delete with Ctrl+Z', async () => {
    const user = userEvent.setup();
    render(<Board user="a@x.com" />);
    await addCard(user, 'Write docs');
    await user.click(screen.getByRole('button', { name: 'Write docs' }));
    await user.click(screen.getByRole('button', { name: 'Delete card' }));
    await user.keyboard('{Control>}z{/Control}');
    expect(screen.getByRole('button', { name: 'Write docs' })).toBeInTheDocument();
  });

  it('keeps the Undo toast around for at least 20 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<Board user="a@x.com" />);
      await addCard(user, 'Write docs');
      await user.click(screen.getByRole('button', { name: 'Write docs' }));
      await user.click(screen.getByRole('button', { name: 'Delete card' }));
      act(() => {
        vi.advanceTimersByTime(19000);
      });
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('makes the page behind the dialog inert, and Escape works with focus on the dialog', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    const user = userEvent.setup();
    render(<Board user="a@x.com" />, { container: root.appendChild(document.createElement('div')) });
    await user.click(screen.getAllByRole('button', { name: 'Add card' })[0]);
    expect(root).toHaveAttribute('inert');
    screen.getByRole('dialog').focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(root).not.toHaveAttribute('inert');
    root.remove();
  });

  it('gives every card exactly one name-bearing control and no nested interactive roles', async () => {
    const user = userEvent.setup();
    render(<Board user="a@x.com" />);
    await addCard(user, 'Write docs');
    const item = screen.getByRole('listitem');
    expect(within(item).getAllByRole('button')).toHaveLength(1);
    expect(item.closest('[role="button"]')).toBeNull();
  });
});
