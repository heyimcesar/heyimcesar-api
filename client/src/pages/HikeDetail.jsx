import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { getActivity } from '../api/strava';

const GREEN = '#4ade80';

const chartTooltipStyle = {
  contentStyle: { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 },
  itemStyle: { color: '#a1a1aa' },
  labelStyle: { color: '#ffffff', fontWeight: 600 },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
      <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, hint }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
      <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">{title}</p>
      {children}
      {hint && <p className="text-xs text-zinc-700 mt-2 text-center">{hint}</p>}
    </div>
  );
}

export default function HikeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hike, setHike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getActivity(id)
      .then(setHike)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-black text-white p-6 max-w-3xl mx-auto space-y-4 pt-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
      ))}
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-red-400 text-sm">Failed to load hike: {error}</p>
    </div>
  );

  const date = new Date(hike.date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // Sample streams to ~200 points for chart performance
  const { altitude, heartrate, distance } = hike.streams;
  const totalPoints = distance.length;
  const step = Math.max(1, Math.floor(totalPoints / 200));

  const elevationData = distance
    .filter((_, i) => i % step === 0)
    .map((d, idx) => {
      const i = idx * step;
      return {
        dist: parseFloat((d * 0.000621371).toFixed(2)),
        elev: altitude[i] != null ? Math.round(altitude[i] * 3.28084) : null,
      };
    })
    .filter(d => d.elev != null);

  const hrData = heartrate.length > 0
    ? distance
        .filter((_, i) => i % step === 0)
        .map((d, idx) => {
          const i = idx * step;
          return {
            dist: parseFloat((d * 0.000621371).toFixed(2)),
            hr: heartrate[i] ?? null,
          };
        })
        .filter(d => d.hr != null)
    : [];

  const elevMin = Math.min(...elevationData.map(d => d.elev));
  const elevMax = Math.max(...elevationData.map(d => d.elev));

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-900 px-6 py-5">
        <button
          onClick={() => navigate('/project/hikes')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition text-sm mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All Hikes
        </button>
        <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">{date}</p>
        <h1 className="text-2xl font-bold tracking-tight">{hike.name}</h1>
        {hike.description && (
          <p className="text-zinc-400 text-sm mt-2">{hike.description}</p>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Distance" value={`${hike.distance_miles} mi`} />
          <StatCard
            label="Elevation Gain"
            value={`${Number(hike.elevation_gain_feet).toLocaleString()} ft`}
          />
          <StatCard label="Moving Time" value={hike.moving_time_formatted} />
          <StatCard
            label="Avg Heart Rate"
            value={hike.average_heartrate ? `${Math.round(hike.average_heartrate)} bpm` : '—'}
          />
          <StatCard
            label="Max Heart Rate"
            value={hike.max_heartrate ? `${hike.max_heartrate} bpm` : '—'}
          />
          <StatCard
            label="Calories"
            value={hike.calories ? hike.calories.toLocaleString() : '—'}
            sub={hike.calories ? 'kcal burned' : null}
          />
        </div>

        {/* Elevation range strip */}
        {hike.elevation_high_feet && hike.elevation_low_feet && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">Elevation Low</p>
              <p className="text-white font-semibold">{Number(hike.elevation_low_feet).toLocaleString()} ft</p>
            </div>
            <div className="flex-1 mx-6 h-px bg-gradient-to-r from-zinc-700 via-green-400 to-zinc-700" />
            <div className="text-right">
              <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">Elevation High</p>
              <p className="text-white font-semibold">{Number(hike.elevation_high_feet).toLocaleString()} ft</p>
            </div>
          </div>
        )}

        {/* Elevation chart */}
        {elevationData.length > 0 && (
          <ChartCard
            title="Elevation Profile"
            hint={`${elevMin.toLocaleString()} ft → ${elevMax.toLocaleString()} ft`}
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={elevationData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="dist"
                  tick={{ fill: '#52525b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v} mi`}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#52525b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v.toLocaleString()} ft`}
                  width={72}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  {...chartTooltipStyle}
                  formatter={v => [`${Number(v).toLocaleString()} ft`, 'Elevation']}
                  labelFormatter={l => `${l} mi`}
                />
                <Area
                  type="monotone"
                  dataKey="elev"
                  stroke={GREEN}
                  strokeWidth={2}
                  fill="url(#elevGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: GREEN }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Heart rate chart */}
        {hrData.length > 0 && (
          <ChartCard title="Heart Rate">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={hrData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="dist"
                  tick={{ fill: '#52525b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v} mi`}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#52525b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v} bpm`}
                  width={60}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  {...chartTooltipStyle}
                  formatter={v => [`${v} bpm`, 'Heart Rate']}
                  labelFormatter={l => `${l} mi`}
                />
                <Line
                  type="monotone"
                  dataKey="hr"
                  stroke="#f87171"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#f87171' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Photos */}
        {hike.photos && hike.photos.length > 0 && (
          <div>
            <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">Photos</p>
            <div className="grid grid-cols-2 gap-3">
              {hike.photos.map((photo, i) => (
                <img
                  key={i}
                  src={photo.url}
                  alt={photo.caption || `Photo ${i + 1}`}
                  className="w-full rounded-2xl object-cover aspect-video border border-zinc-800"
                />
              ))}
            </div>
          </div>
        )}

        {/* Strava link */}
        <div className="pt-2">
          <a
            href={`https://www.strava.com/activities/${hike.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-zinc-500 hover:text-orange-400 transition text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            View on Strava
          </a>
        </div>
      </div>
    </div>
  );
}