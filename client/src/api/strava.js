async function fetchStrava(endpoint) {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
    return res.json();
  }
  
export const getActivities = (params = '') =>
    fetchStrava(`/strava/activities${params}`);
  
export const getActivity = (id) =>
    fetchStrava(`/strava/activity/${id}`);