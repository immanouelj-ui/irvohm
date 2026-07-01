/*
 * Regroupe setup / login / logout / whoami dans une seule fonction serverless
 * pour rester sous la limite de 12 fonctions du plan Vercel Hobby.
 * Action choisie via ?action=setup-status|setup|login|logout|whoami (whoami par défaut).
 */
const { supabaseFetch } = require('./_lib/supabase');
const { hashPassword, verifyPassword } = require('./_lib/password');
const { createSessionCookie, clearSessionCookie, getCurrentUser, safeEqual } = require('./_lib/auth');
const { logActivity } = require('./_lib/activity');

async function hasAnyUser() {
  const rows = await supabaseFetch('irvohm_users?select=id&limit=1');
  return Array.isArray(rows) && rows.length > 0;
}

async function handleSetupStatus(req, res) {
  const needsSetup = !(await hasAnyUser());
  return res.status(200).json({ needsSetup });
}

async function handleSetup(req, res) {
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    console.error('ADMIN_PASSWORD / ADMIN_SESSION_SECRET non configurés');
    return res.status(500).json({ error: 'CRM non configuré.' });
  }

  const { setupKey, email, name, password } = req.body || {};

  if (!setupKey || !safeEqual(setupKey, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ error: "Clé d'installation incorrecte." });
  }
  if (await hasAnyUser()) {
    return res.status(409).json({ error: 'Un compte existe déjà. Utilise la connexion normale.' });
  }
  if (!email || !name || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email, nom et mot de passe (8 caractères min) requis.' });
  }

  const [user] = await supabaseFetch('irvohm_users', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      email: String(email).trim().toLowerCase(),
      name: String(name).trim(),
      password_hash: await hashPassword(password),
      role: 'admin',
    }),
  });

  await logActivity({ userId: user.id, action: 'user.setup', meta: { email: user.email } });

  res.setHeader('Set-Cookie', createSessionCookie(user.id));
  return res.status(200).json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}

async function handleLogin(req, res) {
  if (!process.env.ADMIN_SESSION_SECRET) {
    console.error('ADMIN_SESSION_SECRET non configuré');
    return res.status(500).json({ error: 'CRM non configuré.' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });

  const rows = await supabaseFetch(
    `irvohm_users?email=eq.${encodeURIComponent(String(email).trim().toLowerCase())}&limit=1`
  );
  const user = rows && rows[0];

  if (!user || !user.active || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }

  await logActivity({ userId: user.id, action: 'user.login' });

  res.setHeader('Set-Cookie', createSessionCookie(user.id));
  return res.status(200).json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}

async function handleLogout(req, res) {
  res.setHeader('Set-Cookie', clearSessionCookie());
  return res.status(200).json({ ok: true });
}

async function handleWhoami(req, res) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié.' });
  return res.status(200).json({ user });
}

module.exports = async (req, res) => {
  const action = (req.query && req.query.action) || (req.method === 'GET' ? 'whoami' : '');

  try {
    if (action === 'setup-status' && req.method === 'GET') return await handleSetupStatus(req, res);
    if (action === 'setup' && req.method === 'POST') return await handleSetup(req, res);
    if (action === 'login' && req.method === 'POST') return await handleLogin(req, res);
    if (action === 'logout' && req.method === 'POST') return await handleLogout(req, res);
    if (action === 'whoami' && req.method === 'GET') return await handleWhoami(req, res);
    return res.status(400).json({ error: 'Action inconnue.' });
  } catch (err) {
    console.error('admin-auth error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
