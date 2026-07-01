const { getCurrentUser } = require('./_lib/auth');

module.exports = async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié.' });
  return res.status(200).json({ user });
};
