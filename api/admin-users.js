/*
 * Regroupe gestion des employés et journal d'activité dans une seule fonction serverless
 * pour rester sous la limite de 12 fonctions du plan Vercel Hobby.
 * Ressource choisie via ?resource=user|activity (user par défaut). Réservé aux admins.
 */
const { getCurrentUser } = require('./_lib/auth');
const { supabaseFetch } = require('./_lib/supabase');
const { hashPassword } = require('./_lib/password');
const { logActivity } = require('./_lib/activity');

async function handleUser(req, res, user) {
  if (req.method === 'GET') {
    const users = await supabaseFetch('irvohm_users?select=id,email,name,role,active,created_at&order=created_at.asc');
    return res.status(200).json({ users });
  }

  if (req.method === 'POST') {
    const { email, name, password, role } = req.body || {};
    if (!email || !name || !password || password.length < 8) {
      return res.status(400).json({ error: 'Email, nom et mot de passe (8 caractères min) requis.' });
    }
    const cleanRole = role === 'admin' ? 'admin' : 'employe';

    const [created] = await supabaseFetch('irvohm_users', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        email: String(email).trim().toLowerCase(),
        name: String(name).trim(),
        password_hash: await hashPassword(password),
        role: cleanRole,
      }),
    });

    await logActivity({ userId: user.id, action: 'user.created', meta: { created_user_id: created.id, email: created.email, role: cleanRole } });

    return res.status(200).json({ ok: true, user: { id: created.id, email: created.email, name: created.name, role: created.role, active: created.active } });
  }

  if (req.method === 'PATCH') {
    const id = req.query && req.query.id;
    if (!id) return res.status(400).json({ error: 'id manquant.' });

    const patch = {};
    if (typeof req.body.active === 'boolean') patch.active = req.body.active;
    if (req.body.role === 'admin' || req.body.role === 'employe') patch.role = req.body.role;
    if (typeof req.body.password === 'string' && req.body.password.length >= 8) {
      patch.password_hash = await hashPassword(req.body.password);
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });

    const [updated] = await supabaseFetch(`irvohm_users?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });

    await logActivity({ userId: user.id, action: 'user.updated', meta: { target_user_id: id, changes: Object.keys(patch) } });

    return res.status(200).json({ ok: true, user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, active: updated.active } });
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).json({ error: 'Méthode non autorisée' });
}

async function handleActivity(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const params = new URLSearchParams();
  params.set('select', '*,actor:irvohm_users!user_id(name,email),lead:irvohm_leads!lead_id(nom)');
  params.set('order', 'created_at.desc');
  params.set('limit', '200');
  if (req.query && req.query.user_id) params.set('user_id', `eq.${req.query.user_id}`);
  if (req.query && req.query.lead_id) params.set('lead_id', `eq.${req.query.lead_id}`);

  const activity = await supabaseFetch(`irvohm_activity_log?${params.toString()}`);
  return res.status(200).json({ activity });
}

module.exports = async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié.' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });

  const resource = (req.query && req.query.resource) || 'user';

  try {
    if (resource === 'user') return await handleUser(req, res, user);
    if (resource === 'activity') return await handleActivity(req, res);
    return res.status(400).json({ error: 'Ressource inconnue.' });
  } catch (err) {
    console.error('admin-users error:', err);
    if (String(err.message).includes('23505')) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
