const { supabaseFetch } = require('./_lib/supabase');
const { verifyPassword } = require('./_lib/password');
const { createSessionCookie } = require('./_lib/auth');
const { logActivity } = require('./_lib/activity');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  if (!process.env.ADMIN_SESSION_SECRET) {
    console.error('ADMIN_SESSION_SECRET non configuré');
    return res.status(500).json({ error: 'CRM non configuré.' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });

  try {
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
  } catch (err) {
    console.error('admin-login error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
