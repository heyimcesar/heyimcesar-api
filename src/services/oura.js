const OURA_API_URL = 'https://api.ouraring.com/v2/usercollection';

async function ouraFetch(endpoint) {
  const res = await fetch(`${OURA_API_URL}/${endpoint}`, {
    headers: { Authorization: `Bearer ${process.env.OURA_API_TOKEN}` },
  });
  return res.json();
}

export async function getSleep() {
  return ouraFetch('sleep?limit=7');
}

export async function getReadiness() {
  return ouraFetch('readiness?limit=7');
}

export async function getActivity() {
  return ouraFetch('daily_activity?limit=7');
}