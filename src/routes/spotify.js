import { Router } from 'express';

const router = Router();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'https://api.heyimcesar.com/spotify/callback';

let accessToken = null;
let tokenExpiresAt = 0;

// ─── Token Helpers ────────────────────────────────────────────────────────────

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;

  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!refreshToken) throw new Error('SPOTIFY_REFRESH_TOKEN not set in .env');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Failed to refresh token');

  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60000; // refresh 1 min early
  return accessToken;
}

async function spotifyFetch(endpoint) {
  const token = await getAccessToken();
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Spotify API error: ${response.status} ${endpoint}`);
  return response.json();
}

// ─── Auth Routes (run once to get your refresh token) ─────────────────────────

router.get('/login', (req, res) => {
  const scopes = [
    'user-top-read',
    'user-read-recently-played',
    'user-read-currently-playing',
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: scopes,
    redirect_uri: REDIRECT_URI,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) return res.status(400).json({ error });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await response.json();
  if (!response.ok) return res.status(400).json({ error: data.error_description });

  // Store access token in memory
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60000;

  // Show the refresh token so you can copy it into your .env
  res.json({
    message: 'Success! Copy the refresh_token below into your .env as SPOTIFY_REFRESH_TOKEN',
    refresh_token: data.refresh_token,
  });
});

// ─── Data Routes ──────────────────────────────────────────────────────────────

router.get('/', (req, res) => res.json({ service: 'spotify', status: 'ok' }));

router.get('/top-tracks', async (req, res) => {
  const { time_range = 'short_term', limit = 10 } = req.query;
  // time_range: short_term (4 weeks), medium_term (6 months), long_term (all time)
  try {
    const data = await spotifyFetch(`/me/top/tracks?time_range=${time_range}&limit=${limit}`);
    const tracks = data.items.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      album_image: track.album.images[1]?.url,
      preview_url: track.preview_url,
      popularity: track.popularity,
      external_url: track.external_urls.spotify,
    }));
    res.json(tracks);
  } catch (err) {
    console.error('Error fetching top tracks:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-artists', async (req, res) => {
  const { time_range = 'short_term', limit = 10 } = req.query;
  try {
    const data = await spotifyFetch(`/me/top/artists?time_range=${time_range}&limit=${limit}`);
    const artists = data.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers.total,
      image: artist.images[1]?.url,
      external_url: artist.external_urls.spotify,
    }));
    res.json(artists);
  } catch (err) {
    console.error('Error fetching top artists:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent', async (req, res) => {
  const { limit = 20 } = req.query;
  try {
    const data = await spotifyFetch(`/me/player/recently-played?limit=${limit}`);
    const tracks = data.items.map(item => ({
      played_at: item.played_at,
      name: item.track.name,
      artist: item.track.artists.map(a => a.name).join(', '),
      album: item.track.album.name,
      album_image: item.track.album.images[2]?.url,
      external_url: item.track.external_urls.spotify,
    }));
    res.json(tracks);
  } catch (err) {
    console.error('Error fetching recent tracks:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/now-playing', async (req, res) => {
  try {
    const token = await getAccessToken();
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` },
    });

    // 204 = no content, nothing is playing
    if (response.status === 204 || response.status === 202) {
      return res.json({ is_playing: false });
    }

    const data = await response.json();
    if (!data || !data.item) return res.json({ is_playing: false });

    res.json({
      is_playing: data.is_playing,
      name: data.item.name,
      artist: data.item.artists.map(a => a.name).join(', '),
      album: data.item.album.name,
      album_image: data.item.album.images[1]?.url,
      progress_ms: data.progress_ms,
      duration_ms: data.item.duration_ms,
      external_url: data.item.external_urls.spotify,
    });
  } catch (err) {
    console.error('Error fetching now playing:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;