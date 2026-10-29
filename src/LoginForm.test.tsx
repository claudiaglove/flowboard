import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './components/LoginForm';
import App from './App';

describe('LoginForm accessibility', () => {
  it('declares the purpose of each input for autofill', async () => {
    const user = userEvent.setup();
    render(<LoginForm onAuth={() => {}} />);
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveAttribute('autocomplete', 'current-password');
    await user.click(screen.getByRole('tab', { name: 'Sign up' }));
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByText('Use at least 6 characters.')).toBeInTheDocument();
  });

  it('ties a sign-in error to the fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm onAuth={() => {}} />);
    await user.type(screen.getByLabelText('Email Address'), 'nobody@example.com');
    await user.type(screen.getByLabelText('Password', { selector: 'input' }), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid email or password.');
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password', { selector: 'input' }).getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('moves between tabs with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<LoginForm onAuth={() => {}} />);
    screen.getByRole('tab', { name: 'Password' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Magic link' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Magic link' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('App', () => {
  it('has a landmark and a title for each view', async () => {
    const view = render(<App />);
    expect(document.title).toBe('Sign in to FlowBoard – Kanban board for small teams');
    expect(screen.getByRole('main')).toBeInTheDocument();
    view.unmount();
    localStorage.setItem('flowboard-session', 'a@x.com');
    render(<App />);
    expect(document.title).toBe('Team Board – FlowBoard');
    await screen.findByRole('heading', { name: 'Team Board' });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Skip to board' })).toHaveAttribute('href', '#board');
  });
});
