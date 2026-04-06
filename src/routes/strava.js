import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  getActivities,
  getActivity,
  getActivityStreams,
  getActivityPhotos,
  formatDuration,
} from '../services/strava.js';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

router.get('/', (req, res) => res.json({ service: 'strava', status: 'ok' }));

router.get('/activities', async (req, res) => {
  try {
    const { per_page = 20, page = 1 } = req.query;
    const hikes = await getActivities({ per_page, page });

    res.json({
      count: hikes.length,
      activities: hikes.map((a) => ({
        id: a.id,
        name: a.name,
        date: a.start_date_local,
        distance_meters: a.distance,
        elevation_gain_meters: a.total_elevation_gain,
        distance_miles: (a.distance * 0.000621371).toFixed(2),
        elevation_gain_feet: (a.total_elevation_gain * 3.28084).toFixed(0),
        moving_time_formatted: formatDuration(a.moving_time),
        moving_time_seconds: a.moving_time,
        average_heartrate: a.average_heartrate || null,
        max_heartrate: a.max_heartrate || null,
        map_summary_polyline: a.map?.summary_polyline || null,
        photos_count: a.total_photo_count,
      })),
    });
  } catch (err) {
    console.error('Error fetching activities:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/activity/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [detail, streams, photos] = await Promise.all([
      getActivity(id),
      getActivityStreams(id),
      getActivityPhotos(id),
    ]);

    res.json({
      id: detail.id,
      name: detail.name,
      date: detail.start_date_local,
      description: detail.description || null,
      distance_meters: detail.distance,
      elevation_gain_meters: detail.total_elevation_gain,
      elevation_high_meters: detail.elev_high ?? null,
      elevation_low_meters: detail.elev_low ?? null,
      distance_miles: (detail.distance * 0.000621371).toFixed(2),
      elevation_gain_feet: (detail.total_elevation_gain * 3.28084).toFixed(0),
      elevation_high_feet: detail.elev_high ? (detail.elev_high * 3.28084).toFixed(0) : null,
      elevation_low_feet: detail.elev_low ? (detail.elev_low * 3.28084).toFixed(0) : null,
      moving_time_formatted: formatDuration(detail.moving_time),
      moving_time_seconds: detail.moving_time,
      average_heartrate: detail.average_heartrate || null,
      max_heartrate: detail.max_heartrate || null,
      calories: detail.calories || null,
      start_coords: detail.start_latlng,
      end_coords: detail.end_latlng,
      polyline: detail.map?.polyline || null,
      streams: {
        latlng: streams.latlng?.data || [],
        altitude: streams.altitude?.data || [],
        heartrate: streams.heartrate?.data || [],
        time: streams.time?.data || [],
        distance: streams.distance?.data || [],
      },
      photos: photos.map((p) => ({
        caption: p.caption || null,
        url: p.urls?.['600'] || null,
        location: p.location || null,
        taken_at: p.created_at_local || null,
      })),
    });
  } catch (err) {
    console.error('Error fetching activity:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/activity/:id/photos-geo', (req, res) => {
  try {
    const raw = readFileSync(join(__dirname, '../data/hike-photos.json'), 'utf-8');
    const all = JSON.parse(raw);
    const photos = all.filter(p => String(p.hikeId) === String(req.params.id));
    res.json({ photos });
  } catch (err) {
    console.error('Error reading hike photos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;