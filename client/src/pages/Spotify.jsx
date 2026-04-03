import { useState, useEffect, useRef } from 'react';

const TIME_RANGES = [
  { key: 'short_term', label: '4 Weeks' },
  { key: 'medium_term', label: '6 Months' },
  { key: 'long_term', label: 'All Time' },
];

async function fetchSpotify(endpoint) {
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return res.json();
}

function NowPlaying() {
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpotify('/spotify/now-playing')
      .then(setTrack)
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetchSpotify('/spotify/now-playing').then(setTrack);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;
  if (!track?.is_playing) return (
    <div className="flex items-center gap-3 text-zinc-500 text-sm">
      <span className="w-2 h-2 rounded-full bg-zinc-600 inline-block" />
      Not playing anything right now
    </div>
  );

  const progress = Math.round((track.progress_ms / track.duration_ms) * 100);

  return (
    <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 w-full">
      <div className="relative flex-shrink-0">
        <img
          src={track.album_image}
          alt={track.album}
          className="w-14 h-14 rounded-lg object-cover"
        />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-green-400 uppercase tracking-widest">Now Playing</span>
        </div>
        <a
          href={track.external_url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-white hover:text-green-400 transition truncate block"
        >
          {track.name}
        </a>
        <p className="text-zinc-400 text-sm truncate">{track.artist}</p>
        <div className="mt-2 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function TrackRow({ track, rank }) {
  return (
    <a
      href={track.external_url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-900 transition group"
    >
      <span className="text-zinc-600 font-mono text-sm w-5 text-right flex-shrink-0 group-hover:text-zinc-400 transition">
        {rank}
      </span>
      <img
        src={track.album_image}
        alt={track.album}
        className="w-10 h-10 rounded-md object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate group-hover:text-green-400 transition">
          {track.name}
        </p>
        <p className="text-zinc-500 text-xs truncate">{track.artist}</p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1">
        <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-600 group-hover:bg-green-400 rounded-full transition-all duration-300"
            style={{ width: `${track.popularity}%` }}
          />
        </div>
      </div>
    </a>
  );
}

function ArtistRow({ artist, rank }) {
  return (
    <a
      href={artist.external_url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-900 transition group"
    >
      <span className="text-zinc-600 font-mono text-sm w-5 text-right flex-shrink-0 group-hover:text-zinc-400 transition">
        {rank}
      </span>
      <img
        src={artist.image}
        alt={artist.name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate group-hover:text-green-400 transition">
          {artist.name}
        </p>
        <p className="text-zinc-500 text-xs truncate">
          {artist.genres.slice(0, 2).join(', ') || 'No genres listed'}
        </p>
      </div>
      <span className="text-zinc-600 text-xs flex-shrink-0">
        {(artist.followers / 1000).toFixed(0)}k
      </span>
    </a>
  );
}

function RecentRow({ track }) {
  const date = new Date(track.played_at);
  const timeAgo = formatTimeAgo(date);

  return (
    <a
      href={track.external_url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-900 transition group"
    >
      <img
        src={track.album_image}
        alt={track.album}
        className="w-9 h-9 rounded-md object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate group-hover:text-green-400 transition">
          {track.name}
        </p>
        <p className="text-zinc-500 text-xs truncate">{track.artist}</p>
      </div>
      <span className="text-zinc-600 text-xs flex-shrink-0">{timeAgo}</span>
    </a>
  );
}

function formatTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs font-mono rounded-lg transition ${
        active
          ? 'bg-green-400 text-black font-semibold'
          : 'text-zinc-500 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export default function Spotify() {
  const [timeRange, setTimeRange] = useState('short_term');
  const [tracks, setTracks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [activeTab, setActiveTab] = useState('tracks');

  useEffect(() => {
    setLoadingTracks(true);
    setLoadingArtists(true);
    fetchSpotify(`/spotify/top-tracks?time_range=${timeRange}&limit=20`)
      .then(setTracks)
      .finally(() => setLoadingTracks(false));
    fetchSpotify(`/spotify/top-artists?time_range=${timeRange}&limit=20`)
      .then(setArtists)
      .finally(() => setLoadingArtists(false));
  }, [timeRange]);

  useEffect(() => {
    fetchSpotify('/spotify/recent?limit=20')
      .then(setRecent)
      .finally(() => setLoadingRecent(false));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-900 px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">project / spotify</p>
          <h1 className="text-2xl font-bold tracking-tight">Listening Stats</h1>
        </div>
        <svg className="w-7 h-7 text-green-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Now Playing */}
        <NowPlaying />

        {/* Time Range */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest">Top Charts</h2>
          <div className="flex gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
            {TIME_RANGES.map(r => (
              <TabButton
                key={r.key}
                active={timeRange === r.key}
                onClick={() => setTimeRange(r.key)}
              >
                {r.label}
              </TabButton>
            ))}
          </div>
        </div>

        {/* Tracks / Artists Tabs */}
        <div>
          <div className="flex gap-6 border-b border-zinc-800 mb-4">
            {['tracks', 'artists'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium capitalize transition border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-green-400 text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'tracks' && (
            <div className="space-y-1">
              {loadingTracks ? (
                <p className="text-zinc-600 text-sm py-4">Loading...</p>
              ) : (
                tracks.map((track, i) => (
                  <TrackRow key={track.id} track={track} rank={i + 1} />
                ))
              )}
            </div>
          )}

          {activeTab === 'artists' && (
            <div className="space-y-1">
              {loadingArtists ? (
                <p className="text-zinc-600 text-sm py-4">Loading...</p>
              ) : (
                artists.map((artist, i) => (
                  <ArtistRow key={artist.id} artist={artist} rank={i + 1} />
                ))
              )}
            </div>
          )}
        </div>

        {/* Recently Played */}
        <div>
          <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">Recently Played</h2>
          <div className="space-y-1">
            {loadingRecent ? (
              <p className="text-zinc-600 text-sm py-4">Loading...</p>
            ) : (
              recent.map((track, i) => (
                <RecentRow key={`${track.played_at}-${i}`} track={track} />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}