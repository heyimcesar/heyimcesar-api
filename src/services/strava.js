const STRAVA_API_URL = 'https://www.strava.com/api/v3';

let tokenCache = {
  accessToken: process.env.STRAVA_ACCESS_TOKEN,
  refreshToken: process.env.STRAVA_REFRESH_TOKEN,
  expiresAt: parseInt(process.env.STRAVA_TOKEN_EXPIRES_AT, 10),
};

async function getValidToken() {
  const now = Math.floor(Date.now() / 1000);
  if (now < tokenCache.expiresAt - 60) return tokenCache.accessToken;

  console.log('[Strava] Refreshing token...');
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokenCache.refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);

  const data = await res.json();
  tokenCache = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
  console.log('[Strava] Token refreshed, expires:', data.expires_at);
  return tokenCache.accessToken;
}

async function stravaFetch(path) {
  const token = await getValidToken();
  const res = await fetch(`${STRAVA_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Strava API error on ${path}: ${await res.text()}`);
  return res.json();
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}

export async function getActivities({ per_page = 20, page = 1 } = {}) {
  const data = await stravaFetch(`/athlete/activities?per_page=${per_page}&page=${page}`);
  return data.filter((a) => a.type === 'Hike' || a.sport_type === 'Hike');
}

export async function getActivity(id) {
  return stravaFetch(`/activities/${id}`);
}

export async function getActivityStreams(id) {
  return stravaFetch(`/activities/${id}/streams?keys=latlng,altitude,heartrate,time,distance&key_by_type=true`);
}

export async function getActivityPhotos(id) {
  return stravaFetch(`/activities/${id}/photos?size=600`);
}