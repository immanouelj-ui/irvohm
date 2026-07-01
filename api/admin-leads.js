const { isAuthenticated } = require('./_lib/auth');
const { supabaseFetch } = require('./_lib/supabase');

const ALLOWED_STATUSES = ['nouveau', 'contacte', 'devis_envoye', 'gagne', 'perdu'];

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Non authentifié.' });

  try {
    if (req.method === 'GET') {
      const leads = await supabaseFetch('irvohm_leads?select=*&order=created_at.desc');
      return res.status(200).json({ leads });
    }

    if (req.method === 'PATCH') {
      const id = req.query && req.query.id;
      if (!id) return res.status(400).json({ error: 'id manquant.' });

      const patch = {};
      if (req.body && typeof req.body.status === 'string') {
        if (!ALLOWED_STATUSES.includes(req.body.status)) {
          return res.status(400).json({ error: 'Statut invalide.' });
        }
        patch.status = req.body.status;
      }
      if (req.body && typeof req.body.notes === 'string') {
        patch.notes = req.body.notes;
      }
      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
      }
      patch.updated_at = new Date().toISOString();

      const [updated] = await supabaseFetch(`irvohm_leads?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      return res.status(200).json({ ok: true, lead: updated });
    }

    if (req.method === 'DELETE') {
      const id = req.query && req.query.id;
      if (!id) return res.status(400).json({ error: 'id manquant.' });
      await supabaseFetch(`irvohm_leads?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('admin-leads error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
