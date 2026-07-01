const { supabaseFetch } = require('./_lib/supabase');
const { hashPassword } = require('./_lib/password');
const { createSessionCookie, safeEqual } = require('./_lib/auth');
const { logActivity } = require('./_lib/activity');

async function hasAnyUser() {
  const rows = await supabaseFetch('irvohm_users?select=id&limit=1');
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const needsSetup = !(await hasAnyUser());
    return res.status(200).json({ needsSetup });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

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

  try {
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
  } catch (err) {
    console.error('admin-setup error:', err);
    return res.status(500).json({ error: 'Erreur lors de la création du compte.' });
  }
};
