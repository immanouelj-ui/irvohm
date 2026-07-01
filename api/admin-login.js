const { createSessionCookie, safeEqual } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { password } = req.body || {};

  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    console.error('ADMIN_PASSWORD / ADMIN_SESSION_SECRET non configurés');
    return res.status(500).json({ error: 'CRM non configuré.' });
  }

  if (!password || !safeEqual(password, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }

  res.setHeader('Set-Cookie', createSessionCookie());
  res.status(200).json({ ok: true });
};
