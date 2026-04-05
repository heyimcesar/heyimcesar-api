import { createContext, useContext, useState } from 'react';

const UnitsContext = createContext();

export function UnitsProvider({ children }) {
  const [metric, setMetric] = useState(false);
  const toggle = () => setMetric(m => !m);

  return (
    <UnitsContext.Provider value={{ metric, toggle }}>
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  return useContext(UnitsContext);
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

export function formatDistance(metric, meters) {
  if (metric) return `${(meters / 1000).toFixed(2)} km`;
  return `${(meters * 0.000621371).toFixed(2)} mi`;
}

export function formatElevation(metric, meters) {
  if (metric) return `${Math.round(meters).toLocaleString()} m`;
  return `${Math.round(meters * 3.28084).toLocaleString()} ft`;
}

export function formatElevationValue(metric, meters) {
  if (metric) return Math.round(meters);
  return Math.round(meters * 3.28084);
}

export function distanceLabel(metric) {
  return metric ? 'km' : 'mi';
}

export function elevationLabel(metric) {
  return metric ? 'm' : 'ft';
}