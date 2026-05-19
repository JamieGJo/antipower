import { initMap } from './map.js';
import { initFilters } from './filters.js';
import { initCharts } from './charts.js';
import { initTable } from './table.js';

async function bootstrap() {
  const url = import.meta.env.BASE_URL + 'data/events.geojson';
  const res = await fetch(url);
  const geojson = await res.json();
  const features = geojson.features;

  // Filters need yMin/yMax from data and so does the map source. Initialize both.
  initFilters(features);
  await initMap(features);
  initCharts(features);
  initTable(features);
}

bootstrap().catch((e) => {
  console.error(e);
  document.getElementById('map').innerHTML =
    `<div style="padding:20px;font-family:Georgia,serif;color:#b5000f;">Failed to load data: ${e.message}</div>`;
});
