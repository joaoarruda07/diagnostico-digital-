export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, query, lat, lng, placeId } = req.body;
  const KEY = process.env.GOOGLE_API_KEY;

  try {
    // ── Busca textual (ficha do negócio ou concorrentes) ──
    if (action === 'search') {
      const url = `https://places.googleapis.com/v1/places:searchText`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours,places.photos,places.location,places.businessStatus,places.types,places.googleMapsUri',
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: 'pt-BR',
          regionCode: 'BR',
          maxResultCount: 6,
        }),
      });
      const data = await resp.json();
      return res.status(200).json(data);
    }

    // ── Detalhes de um place específico ──
    if (action === 'details') {
      const url = `https://places.googleapis.com/v1/places/${placeId}`;
      const resp = await fetch(url, {
        headers: {
          'X-Goog-Api-Key': KEY,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,rating,userRatingCount,websiteUri,nationalPhoneNumber,regularOpeningHours,photos,location,businessStatus,editorialSummary,priceLevel,types,googleMapsUri,reviews',
        },
      });
      const data = await resp.json();
      return res.status(200).json(data);
    }

    // ── Nearby Search (concorrentes próximos) ──
    if (action === 'nearby') {
      const url = `https://places.googleapis.com/v1/places:searchNearby`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.photos',
        },
        body: JSON.stringify({
          includedTypes: req.body.types || ['doctor'],
          maxResultCount: 8,
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: 5000,
            },
          },
          languageCode: 'pt-BR',
          rankPreference: 'POPULARITY',
        }),
      });
      const data = await resp.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
