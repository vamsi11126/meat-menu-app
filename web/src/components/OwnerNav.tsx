import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/owner/dashboard', label: 'Dashboard' },
  { to: '/owner/prices', label: 'Update Prices' },
  { to: '/owner/menu', label: 'Manage Menu' },
  { to: '/owner/qr', label: 'QR Code' },
  { to: '/owner/settings', label: 'Settings' },
];

const OwnerNav = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 rounded-3xl border border-white/10 bg-white/10 p-2">
      {links.map((link) => (
        <NavLink
          className={({ isActive }) =>
            `rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              isActive ? 'bg-amber-300 text-slate-950' : 'text-slate-200 hover:bg-white/10'
            }`
          }
          key={link.to}
          to={link.to}
        >
          {link.label}
        </NavLink>
      ))}
      <button
        className="ml-auto rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        onClick={handleLogout}
        type="button"
      >
        Logout
      </button>
    </nav>
  );
};

export default OwnerNav;
