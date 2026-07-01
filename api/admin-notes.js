const { getCurrentUser } = require('./_lib/auth');
const { supabaseFetch } = require('./_lib/supabase');
const { logActivity } = require('./_lib/activity');

module.exports = async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié.' });

  try {
    if (req.method === 'GET') {
      const leadId = req.query && req.query.lead_id;
      if (!leadId) return res.status(400).json({ error: 'lead_id manquant.' });
      const notes = await supabaseFetch(
        `irvohm_lead_notes?lead_id=eq.${encodeURIComponent(leadId)}&select=*,author:irvohm_users!author_id(name,email)&order=created_at.desc`
      );
      return res.status(200).json({ notes });
    }

    if (req.method === 'POST') {
      const { lead_id, body } = req.body || {};
      const text = String(body || '').trim();
      if (!lead_id || !text) return res.status(400).json({ error: 'lead_id et body requis.' });

      const [note] = await supabaseFetch('irvohm_lead_notes', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ lead_id, author_id: user.id, body: text }),
      });

      await logActivity({ userId: user.id, action: 'lead.note_added', leadId: lead_id });
      return res.status(200).json({ ok: true, note: { ...note, author: { name: user.name, email: user.email } } });
    }

    if (req.method === 'DELETE') {
      const id = req.query && req.query.id;
      if (!id) return res.status(400).json({ error: 'id manquant.' });
      await supabaseFetch(`irvohm_lead_notes?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('admin-notes error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
