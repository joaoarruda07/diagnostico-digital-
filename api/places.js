export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, query, lat, lng, placeId, types } = req.body;
  const KEY = process.env.GOOGLE_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'GOOGLE_API_KEY not configured' });

  try {
    if (action === 'search') {
      const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.photos,places.location,places.types,places.googleMapsUri',
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: 'pt-BR',
          regionCode: 'BR',
          maxResultCount: 6,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json(data);
      return res.status(200).json(data);
    }

    if (action === 'details') {
      const resp = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          'X-Goog-Api-Key': KEY,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,rating,userRatingCount,websiteUri,nationalPhoneNumber,regularOpeningHours,photos,location,types,editorialSummary,googleMapsUri,reviews',
        },
      });
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json(data);
      return res.status(200).json(data);
    }

    if (action === 'nearby') {
      const placeTypes = types && types.length ? types : ['establishment'];
      const resp = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.photos,places.location',
        },
        body: JSON.stringify({
          includedTypes: placeTypes,
          maxResultCount: 10,
          locationRestriction: {
            circle: {
              center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
              radius: 8000,
            },
          },
          languageCode: 'pt-BR',
          rankPreference: 'POPULARITY',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json(data);
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
