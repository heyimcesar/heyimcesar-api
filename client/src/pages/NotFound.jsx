import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <p className="text-zinc-600 text-8xl font-bold">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-zinc-400 text-sm">This page doesn't exist or was moved.</p>
      <button
        onClick={() => navigate('/')}
        className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition"
      >
        ← Go home
      </button>
    </div>
  );
}