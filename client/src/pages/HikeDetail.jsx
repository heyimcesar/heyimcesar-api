import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getActivity } from '../api/strava';
import {
  useUnits,
  formatDistance,
  formatElevation,
  formatElevationValue,
  distanceLabel,
  elevationLabel,
} from '../context/UnitsContext';

const GREEN = '#4ade80';

const chartTooltipStyle = {
  contentStyle: { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 },
  itemStyle: { color: '#a1a1aa' },
  labelStyle: { color: '#ffffff', fontWeight: 600 },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) map.fitBounds(positions, { padding: [24, 24] });
  }, [map, positions]);
  return null;
}

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
  const { metric } = useUnits();
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

  const positions = hike.streams.latlng ?? [];
  const { altitude, heartrate, distance } = hike.streams;
  const step = Math.max(1, Math.floor(distance.length / 200));

  // Charts use raw meter values, convert at render time based on metric flag
  const elevationData = distance
    .filter((_, i) => i % step === 0)
    .map((d, idx) => {
      const i = idx * step;
      const distVal = metric
        ? parseFloat((d / 1000).toFixed(2))
        : parseFloat((d * 0.000621371).toFixed(2));
      const elevVal = altitude[i] != null
        ? formatElevationValue(metric, altitude[i])
        : null;
      return { dist: distVal, elev: elevVal };
    })
    .filter(d => d.elev != null);

  const hrData = heartrate.length > 0
    ? distance
        .filter((_, i) => i % step === 0)
        .map((d, idx) => {
          const i = idx * step;
          const distVal = metric
            ? parseFloat((d / 1000).toFixed(2))
            : parseFloat((d * 0.000621371).toFixed(2));
          return { dist: distVal, hr: heartrate[i] ?? null };
        })
        .filter(d => d.hr != null)
    : [];

  const elevMin = elevationData.length > 0 ? Math.min(...elevationData.map(d => d.elev)) : 0;
  const elevMax = elevationData.length > 0 ? Math.max(...elevationData.map(d => d.elev)) : 0;
  const dLabel = distanceLabel(metric);
  const eLabel = elevationLabel(metric);

  const startPos = positions[0] ?? null;
  const endPos = positions[positions.length - 1] ?? null;

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
          <StatCard
            label="Distance"
            value={formatDistance(metric, hike.distance_meters)}
          />
          <StatCard
            label="Elevation Gain"
            value={formatElevation(metric, hike.elevation_gain_meters)}
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
        {hike.elevation_high_meters != null && hike.elevation_low_meters != null && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">Elevation Low</p>
              <p className="text-white font-semibold">
                {formatElevation(metric, hike.elevation_low_meters)}
              </p>
            </div>
            <div className="flex-1 mx-6 h-px bg-gradient-to-r from-zinc-700 via-green-400 to-zinc-700" />
            <div className="text-right">
              <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">Elevation High</p>
              <p className="text-white font-semibold">
                {formatElevation(metric, hike.elevation_high_meters)}
              </p>
            </div>
          </div>
        )}

        {/* Route Map */}
        {positions.length > 0 && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest p-5 pb-3">Route</p>
            <div style={{ height: 360 }}>
              <MapContainer
                center={startPos}
                zoom={13}
                style={{ height: '100%', width: '100%', background: '#09090b' }}
                zoomControl={true}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                <Polyline
                  positions={positions}
                  pathOptions={{ color: GREEN, weight: 3, opacity: 0.9 }}
                />
                <FitBounds positions={positions} />
              </MapContainer>
            </div>
            <div className="flex items-center gap-6 px-5 py-3 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0" />
                <span className="text-xs text-zinc-500">
                  Start {startPos ? `${startPos[0].toFixed(4)}, ${startPos[1].toFixed(4)}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-xs text-zinc-500">
                  End {endPos ? `${endPos[0].toFixed(4)}, ${endPos[1].toFixed(4)}` : ''}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Elevation chart */}
        {elevationData.length > 0 && (
          <ChartCard
            title="Elevation Profile"
            hint={`${elevMin.toLocaleString()} ${eLabel} → ${elevMax.toLocaleString()} ${eLabel}`}
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
                  tickFormatter={v => `${v} ${dLabel}`}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#52525b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v.toLocaleString()} ${eLabel}`}
                  width={80}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  {...chartTooltipStyle}
                  formatter={v => [`${Number(v).toLocaleString()} ${eLabel}`, 'Elevation']}
                  labelFormatter={l => `${l} ${dLabel}`}
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
                  tickFormatter={v => `${v} ${dLabel}`}
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
                  labelFormatter={l => `${l} ${dLabel}`}
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