const INDIA_BOUNDS = { nelat: 35.7, nelng: 97.4, swlat: 6.5, swlng: 68.0 };

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Data provider returned ${response.status}${body ? `: ${body.slice(0, 120)}` : ''}`);
  }
  return response.json();
}

export async function fetchIndiaObservations({ q = '', limit = 30, bounds = INDIA_BOUNDS } = {}) {
  const params = new URLSearchParams({
    ...bounds, quality_grade: 'research', photos: 'true', per_page: String(Math.min(limit, 60)),
    order: 'desc', order_by: 'observed_on', locale: 'en',
  });
  if (q.trim()) params.set('q', q.trim());
  const data = await jsonFetch(`https://api.inaturalist.org/v1/observations?${params}`);
  const results = (data.results || []).map((item) => ({
    id: `inat-${item.id}`,
    source: 'iNaturalist',
    sourceUrl: item.uri || `https://www.inaturalist.org/observations/${item.id}`,
    name: item.taxon?.preferred_common_name || item.taxon?.name || 'Unidentified observation',
    scientificName: item.taxon?.name || 'Identification pending',
    image: item.photos?.[0]?.url?.replace('square', 'medium') || item.taxon?.default_photo?.medium_url || '',
    observedOn: item.observed_on || 'Date not supplied',
    place: item.place_guess || 'India',
    taxonId: item.taxon?.id,
    rank: item.taxon?.rank || 'unknown',
    taxonGroup: item.taxon?.iconic_taxon_name || 'Life',
    taxonPhoto: item.taxon?.default_photo?.medium_url || '',
    conservation: item.taxon?.conservation_status?.status_name || null,
    description: item.taxon?.wikipedia_summary || '',
    observationCount: item.taxon?.observations_count || null,
    observer: item.user?.login || 'Community observer',
  }));
  return { results, total: Number(data.total_results || 0), source: 'iNaturalist' };
}

export async function searchGbifSpecies(q, limit = 12) {
  if (!q.trim()) return [];
  const params = new URLSearchParams({ q: q.trim(), limit: String(limit), rank: 'SPECIES' });
  const data = await jsonFetch(`https://api.gbif.org/v1/species/suggest?${params}`);
  return (data || []).map((item) => ({
    id: `gbif-${item.key}`,
    source: 'GBIF',
    sourceUrl: `https://www.gbif.org/species/${item.key}`,
    name: item.vernacularName || item.canonicalName || item.scientificName,
    scientificName: item.scientificName || item.canonicalName,
    kingdom: item.kingdom,
    family: item.family,
    rank: item.rank,
    status: item.taxonomicStatus,
    image: '',
  }));
}

export async function fetchGbifSummary() {
  const params = new URLSearchParams({ country: 'IN', limit: '0' });
  const data = await jsonFetch(`https://api.gbif.org/v1/occurrence/search?${params}`);
  return { count: Number(data.count || 0), source: 'GBIF occurrence search' };
}

export async function fetchRecentIndiaObservations() {
  const data = await fetchIndiaObservations({ limit: 45 });
  return { results: data.results, count: data.total, source: 'iNaturalist research-grade observations' };
}
