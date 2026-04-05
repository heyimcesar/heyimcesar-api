import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActivities } from '../api/strava';
import { useUnits, formatDistance, formatElevation } from '../context/UnitsContext';

function UnitToggle() {
  const { metric, toggle } = useUnits();
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-mono transition hover:border-zinc-600"
    >
      <span className={metric ? 'text-zinc-600' : 'text-green-400'}>mi</span>
      <span className="text-zinc-700">/</span>
      <span className={metric ? 'text-green-400' : 'text-zinc-600'}>km</span>
    </button>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-zinc-600 text-xs font-mono uppercase tracking-widest">{label}</span>
      <span className="text-white text-sm font-semibold">{value}</span>
    </div>
  );
}

function HikeCard({ hike, onClick }) {
  const { metric } = useUnits();
  const date = new Date(hike.date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-zinc-950 border border-zinc-800 rounded-2xl p-5 hover:border-green-400/40 hover:bg-zinc-900 transition group"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">{date}</p>
          <h3 className="text-white font-semibold text-lg group-hover:text-green-400 transition">
            {hike.name}
          </h3>
        </div>
        <svg className="w-4 h-4 text-zinc-700 group-hover:text-green-400 transition flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-zinc-800">
        <StatPill label="Distance" value={formatDistance(metric, hike.distance_meters)} />
        <StatPill label="Elevation" value={formatElevation(metric, hike.elevation_gain_meters)} />
        <StatPill label="Time" value={hike.moving_time_formatted} />
        <StatPill
          label="Avg HR"
          value={hike.average_heartrate ? `${Math.round(hike.average_heartrate)} bpm` : '—'}
        />
      </div>
    </button>
  );
}

export default function Hikes() {
  const [hikes, setHikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { metric } = useUnits();

  useEffect(() => {
    getActivities()
      .then(data => setHikes(data.activities))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalMeters = hikes.reduce((sum, h) => sum + (h.distance_meters ?? 0), 0);
  const totalElevMeters = hikes.reduce((sum, h) => sum + (h.elevation_gain_meters ?? 0), 0);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-zinc-900 px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">project / hikes</p>
          <h1 className="text-2xl font-bold tracking-tight">My Hikes</h1>
        </div>
        <div className="flex items-center gap-3">
          <UnitToggle />
          <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
          </svg>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-2xl p-5 text-red-400 text-sm">
            Failed to load hikes: {error}
          </div>
        )}

        {!loading && !error && hikes.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-12">No hikes found.</p>
        )}

        {!loading && !error && hikes.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">Total Hikes</p>
                <p className="text-2xl font-bold text-white">{hikes.length}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">Total Distance</p>
                <p className="text-2xl font-bold text-white">{formatDistance(metric, totalMeters)}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">Total Elevation</p>
                <p className="text-2xl font-bold text-white">{formatElevation(metric, totalElevMeters)}</p>
              </div>
            </div>

            <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">
              {hikes.length} hike{hikes.length !== 1 ? 's' : ''} tracked
            </p>
            <div className="space-y-4">
              {hikes.map(hike => (
                <HikeCard
                  key={hike.id}
                  hike={hike}
                  onClick={() => navigate(`/project/hikes/${hike.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}