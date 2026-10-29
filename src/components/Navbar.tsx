import logoIcon from '../assets/logo-icon.svg';

interface Props {
  email: string;
  onSignOut: () => void;
}

export default function Navbar({ email, onSignOut }: Props) {
  return (
    <header className="navbar">
      <a className="skip-link" href="#board">Skip to board</a>
      <div className="nav-left">
        <span className="logo">
          <img src={logoIcon} alt="" width={20} height={20} />
        </span>
        <span className="brand">FlowBoard</span>
        <span className="nav-link nav-current">Boards</span>
      </div>
      <div className="nav-right">
        <span className="avatar" aria-hidden="true">{email.charAt(0).toUpperCase()}</span>
        <span className="sr-only">Signed in as {email}</span>
        <button className="nav-link strong signout" onClick={onSignOut}>Sign out</button>
      </div>
    </header>
  );
}
