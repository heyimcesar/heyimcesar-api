import { NavLink } from 'react-router-dom';

const PROJECTS = [
  {
    path: '/project/spotify',
    label: 'Spotify',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
  },
  {
    path: '/project/mtg',
    label: 'MTG',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L20 8.5v7L12 19.82 4 15.5v-7l8-4.32z"/>
      </svg>
    ),
  },
];

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-900">
      <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">

        {/* Logo */}
        <NavLink
          to="/"
          className="text-sm font-mono text-zinc-500 hover:text-white transition"
        >
          heyimcesar<span className="text-zinc-700">/</span>api
        </NavLink>

        {/* Project links */}
        <div className="flex items-center gap-1">
          {PROJECTS.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </div>

      </div>
    </nav>
  );
}