const { getCurrentUser } = require('./_lib/auth');
const { supabaseFetch } = require('./_lib/supabase');

module.exports = async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié.' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const params = new URLSearchParams();
    params.set('select', '*,actor:irvohm_users!user_id(name,email),lead:irvohm_leads!lead_id(nom)');
    params.set('order', 'created_at.desc');
    params.set('limit', '200');
    if (req.query && req.query.user_id) params.set('user_id', `eq.${req.query.user_id}`);
    if (req.query && req.query.lead_id) params.set('lead_id', `eq.${req.query.lead_id}`);

    const activity = await supabaseFetch(`irvohm_activity_log?${params.toString()}`);
    return res.status(200).json({ activity });
  } catch (err) {
    console.error('admin-activity error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
