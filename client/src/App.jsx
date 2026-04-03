import { Routes, Route } from 'react-router-dom';
import MTGSets from './pages/MTGSets';
import MTGSetCards from './pages/MTGSetCards';
import Spotify from './pages/Spotify';
import NotFound from './pages/NotFound';
import Navbar from './components/Navbar';

export default function App() {
  return (
    <>
      <Navbar />
      <div className="pt-12"> {/* offset for fixed navbar height */}
        <Routes>
          <Route path="/" element={
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
            <h1 className="text-5xl font-bold tracking-tight">heyimcesar-api</h1>
            <p className="text-zinc-400 text-lg">Under construction 🚧</p>
          </div>
          } />
          <Route path="/project/spotify" element={<Spotify />} />
          <Route path="/project/mtg" element={<MTGSets />} />
          <Route path="/project/mtg/:setId" element={<MTGSetCards />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
}