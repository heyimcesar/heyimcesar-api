import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis, CartesianGrid,
} from 'recharts';

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchSpotify(endpoint) {
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return res.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TIME_RANGES = [
  { key: 'short_term', label: '4 Weeks' },
  { key: 'medium_term', label: '6 Months' },
  { key: 'long_term', label: 'All Time' },
];

const GREEN = '#4ade80';
const ZINC = '#3f3f46';

const chartTooltipStyle = {
  contentStyle: { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 },
  itemStyle: { color: '#a1a1aa' },
  labelStyle: { color: '#ffffff', fontWeight: 600 },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

// ─── Shared Components ────────────────────────────────────────────────────────

function TimeRangePicker({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
      {TIME_RANGES.map(r => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={`px-3 py-1 text-xs font-mono rounded-lg transition ${
            value === r.key
              ? 'bg-green-400 text-black font-semibold'
              : 'text-zinc-500 hover:text-white'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest">{title}</h2>
      {right}
    </div>
  );
}

function EmptyState({ message }) {
  return <p className="text-zinc-600 text-sm py-8 text-center">{message}</p>;
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

// ─── Now Playing ─────────────────────────────────────────────────────────────

function NowPlaying() {
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpotify('/spotify/now-playing').then(setTrack).finally(() => setLoading(false));
    const interval = setInterval(() => fetchSpotify('/spotify/now-playing').then(setTrack), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="h-24 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />;

  if (!track?.is_playing) return (
    <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-zinc-500 text-sm">
      <span className="w-2 h-2 rounded-full bg-zinc-700 inline-block" />
      Not playing anything right now
    </div>
  );

  const progress = Math.round((track.progress_ms / track.duration_ms) * 100);

  return (
    <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 w-full">
      <div className="relative flex-shrink-0">
        <img src={track.album_image} alt={track.album} className="w-14 h-14 rounded-lg object-cover" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-mono text-green-400 uppercase tracking-widest">Now Playing</span>
        <a href={track.external_url} target="_blank" rel="noreferrer"
          className="font-semibold text-white hover:text-green-400 transition truncate block">
          {track.name}
        </a>
        <p className="text-zinc-400 text-sm truncate">{track.artist}</p>
        <div className="mt-2 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-green-400 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSpotify('/spotify/top-tracks?time_range=short_term&limit=5'),
      fetchSpotify('/spotify/top-artists?time_range=short_term&limit=5'),
    ]).then(([tracks, artists]) => {
      setTopTracks(tracks);
      setTopArtists(artists);
    }).finally(() => setLoading(false));
  }, []);

  const chartData = topTracks.map(t => ({
    name: t.name.length > 18 ? t.name.slice(0, 18) + '…' : t.name,
    popularity: t.popularity,
  }));

  return (
    <div className="space-y-8">
      <NowPlaying />

      {!loading && (
        <ChartCard title="Top 5 Tracks · Popularity Score">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltipStyle} formatter={v => [`${v}`, 'Popularity']} />
              <Bar dataKey="popularity" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? GREEN : ZINC} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <SectionHeader title="Top Tracks · 4 Weeks" />
          {loading ? <EmptyState message="Loading..." /> : (
            <div className="space-y-1">
              {topTracks.map((track, i) => (
                <a key={track.id} href={track.external_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-900 transition group">
                  <span className="text-zinc-600 font-mono text-xs w-4 text-right">{i + 1}</span>
                  <img src={track.album_image} alt={track.album} className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate group-hover:text-green-400 transition">{track.name}</p>
                    <p className="text-zinc-500 text-xs truncate">{track.artist}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHeader title="Top Artists · 4 Weeks" />
          {loading ? <EmptyState message="Loading..." /> : (
            <div className="space-y-1">
              {topArtists.map((artist, i) => (
                <a key={artist.id} href={artist.external_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-900 transition group">
                  <span className="text-zinc-600 font-mono text-xs w-4 text-right">{i + 1}</span>
                  <img src={artist.image} alt={artist.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate group-hover:text-green-400 transition">{artist.name}</p>
                    <p className="text-zinc-500 text-xs truncate">{artist.genres.slice(0, 2).join(', ') || '—'}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Top Tracks Tab ───────────────────────────────────────────────────────────

function TopTracksTab() {
  const [timeRange, setTimeRange] = useState('short_term');
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSpotify(`/spotify/top-tracks?time_range=${timeRange}&limit=20`)
      .then(setTracks)
      .finally(() => setLoading(false));
  }, [timeRange]);

  const chartData = tracks.map(t => ({
    name: t.name.length > 12 ? t.name.slice(0, 12) + '…' : t.name,
    popularity: t.popularity,
  }));

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Top Tracks"
        right={<TimeRangePicker value={timeRange} onChange={setTimeRange} />}
      />

      {!loading && (
        <ChartCard title="Popularity Scores">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ left: 0, right: 8, bottom: 48, top: 4 }}>
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} angle={-40} textAnchor="end" interval={0} />
              <YAxis domain={[0, 100]} tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltipStyle} formatter={v => [`${v}`, 'Popularity']} />
              <Bar dataKey="popularity" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? GREEN : ZINC} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {loading ? <EmptyState message="Loading..." /> : (
        <div className="space-y-1">
          {tracks.map((track, i) => (
            <a key={track.id} href={track.external_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-900 transition group">
              <span className="text-zinc-600 font-mono text-sm w-5 text-right flex-shrink-0">{i + 1}</span>
              <img src={track.album_image} alt={track.album} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate group-hover:text-green-400 transition">{track.name}</p>
                <p className="text-zinc-500 text-xs truncate">{track.artist} · {track.album}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-600 group-hover:bg-green-400 rounded-full transition-all duration-300"
                    style={{ width: `${track.popularity}%` }} />
                </div>
                <span className="text-zinc-600 text-xs w-6 text-right">{track.popularity}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Top Artists Tab ──────────────────────────────────────────────────────────

const CustomScatterDot = (props) => {
  const { cx, cy, payload } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={GREEN} fillOpacity={0.85} />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#a1a1aa" fontSize={10}>
        {payload.name.length > 13 ? payload.name.slice(0, 13) + '…' : payload.name}
      </text>
    </g>
  );
};

const CustomScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>{d.name}</p>
      <p style={{ color: '#a1a1aa' }}>Popularity: {d.x}</p>
      <p style={{ color: '#a1a1aa' }}>Followers: {d.y}k</p>
      <p style={{ color: '#a1a1aa' }}>Genres: {d.z}</p>
    </div>
  );
};

function TopArtistsTab() {
  const [timeRange, setTimeRange] = useState('short_term');
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSpotify(`/spotify/top-artists?time_range=${timeRange}&limit=20`)
      .then(setArtists)
      .finally(() => setLoading(false));
  }, [timeRange]);

  const scatterData = artists.map(a => ({
    x: a.popularity,
    y: Math.round(a.followers / 1000),
    z: a.genres.length,
    name: a.name,
  }));

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Top Artists"
        right={<TimeRangePicker value={timeRange} onChange={setTimeRange} />}
      />

      {!loading && (
        <ChartCard title="Popularity vs Followers" hint="Each dot is an artist — hover for details">
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 24, right: 16, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                type="number" dataKey="x" name="Popularity" domain={[0, 100]}
                label={{ value: 'Popularity →', position: 'insideBottom', offset: -12, fill: '#52525b', fontSize: 11 }}
                tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false}
              />
              <YAxis
                type="number" dataKey="y" name="Followers (k)"
                label={{ value: 'Followers (k)', angle: -90, position: 'insideLeft', offset: 12, fill: '#52525b', fontSize: 11 }}
                tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false}
              />
              <ZAxis type="number" dataKey="z" range={[36, 36]} />
              <Tooltip content={<CustomScatterTooltip />} />
              <Scatter data={scatterData} shape={<CustomScatterDot />} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {loading ? <EmptyState message="Loading..." /> : (
        <div className="space-y-1">
          {artists.map((artist, i) => (
            <a key={artist.id} href={artist.external_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-900 transition group">
              <span className="text-zinc-600 font-mono text-sm w-5 text-right flex-shrink-0">{i + 1}</span>
              <img src={artist.image} alt={artist.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate group-hover:text-green-400 transition">{artist.name}</p>
                <p className="text-zinc-500 text-xs truncate">{artist.genres.slice(0, 3).join(', ') || 'No genres listed'}</p>
              </div>
              <span className="text-zinc-600 text-xs flex-shrink-0">{(artist.followers / 1000).toFixed(0)}k</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recent History Tab ───────────────────────────────────────────────────────

function RecentHistoryTab() {
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpotify('/spotify/recent?limit=50').then(setRecent).finally(() => setLoading(false));
  }, []);

  const hourCounts = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${h}:00`,
    count: 0,
  }));
  recent.forEach(t => {
    const h = new Date(t.played_at).getHours();
    hourCounts[h].count++;
  });
  const maxCount = Math.max(...hourCounts.map(h => h.count), 1);

  return (
    <div className="space-y-8">
      <SectionHeader title="Recently Played" />

      {!loading && (
        <ChartCard title="Listening Activity · Hour of Day" hint="Based on your last 50 tracks">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourCounts} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
              <XAxis dataKey="label" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis hide />
              <Tooltip {...chartTooltipStyle} formatter={v => [`${v}`, 'Tracks played']} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {hourCounts.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.count === 0
                      ? '#18181b'
                      : `rgba(74, 222, 128, ${0.15 + (entry.count / maxCount) * 0.85})`
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {loading ? <EmptyState message="Loading..." /> : (
        <div className="space-y-1">
          {recent.map((track, i) => (
            <a key={`${track.played_at}-${i}`} href={track.external_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-900 transition group">
              <img src={track.album_image} alt={track.album} className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate group-hover:text-green-400 transition">{track.name}</p>
                <p className="text-zinc-500 text-xs truncate">{track.artist}</p>
              </div>
              <span className="text-zinc-600 text-xs flex-shrink-0">{formatTimeAgo(new Date(track.played_at))}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',     label: 'Overview' },
  { key: 'top-tracks',   label: 'Top Tracks' },
  { key: 'top-artists',  label: 'Top Artists' },
  { key: 'recent',       label: 'Recent History' },
];

export default function Spotify() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-zinc-900 px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">project / spotify</p>
          <h1 className="text-2xl font-bold tracking-tight">Listening Stats</h1>
        </div>
        <svg className="w-7 h-7 text-green-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      </div>

      <div className="border-b border-zinc-900 px-6">
        <div className="flex gap-6 max-w-3xl mx-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-green-400 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {activeTab === 'overview'    && <OverviewTab />}
        {activeTab === 'top-tracks'  && <TopTracksTab />}
        {activeTab === 'top-artists' && <TopArtistsTab />}
        {activeTab === 'recent'      && <RecentHistoryTab />}
      </div>
    </div>
  );
}