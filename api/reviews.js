// api/reviews.js — Vercel Serverless Function
// Place ce fichier dans le dossier /api/ de ton projet Vercel

export default async function handler(req, res) {
  // Autorise uniquement ton domaine
  res.setHeader('Access-Control-Allow-Origin', 'https://irvohm.fr');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const PLACE_ID = 'ChIJQ_okxWpr5kcQoG_YwdgJ3g';
  const API_KEY  = process.env.GOOGLE_PLACES_KEY; // clé dans les variables Vercel

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json`
      + `?place_id=${PLACE_ID}`
      + `&fields=name,rating,user_ratings_total,reviews`
      + `&language=fr`
      + `&key=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    // Cache 1h pour éviter de consommer trop de quota API
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des avis' });
  }
}
