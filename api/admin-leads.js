const { getCurrentUser } = require('./_lib/auth');
const { supabaseFetch } = require('./_lib/supabase');
const { logActivity } = require('./_lib/activity');

const ALLOWED_STATUSES = ['nouveau', 'contacte', 'devis_envoye', 'gagne', 'perdu'];

module.exports = async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié.' });

  try {
    if (req.method === 'GET') {
      const leads = await supabaseFetch(
        'irvohm_leads?select=*,created_by_user:irvohm_users!created_by(name,email)&order=created_at.desc'
      );
      return res.status(200).json({ leads });
    }

    if (req.method === 'POST') {
      // Ajout manuel d'un client (hors formulaire public)
      const nom = String((req.body && req.body.nom) || '').trim();
      if (!nom) return res.status(400).json({ error: 'Le nom est requis.' });

      const [created] = await supabaseFetch('irvohm_leads', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          nom,
          email: (req.body.email || '').trim() || null,
          telephone: (req.body.telephone || '').trim() || null,
          code_postal: req.body.codePostal || null,
          adresse: req.body.adresse || null,
          logement: req.body.logement || null,
          role: req.body.role || null,
          status: ALLOWED_STATUSES.includes(req.body.status) ? req.body.status : 'nouveau',
          source: 'manuel',
          created_by: user.id,
        }),
      });

      await logActivity({ userId: user.id, action: 'lead.created', leadId: created.id, meta: { source: 'manuel' } });
      return res.status(200).json({ ok: true, lead: created });
    }

    if (req.method === 'PATCH') {
      const id = req.query && req.query.id;
      if (!id) return res.status(400).json({ error: 'id manquant.' });

      const patch = {};
      if (typeof req.body.status === 'string') {
        if (!ALLOWED_STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Statut invalide.' });
        patch.status = req.body.status;
      }
      if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
      patch.updated_at = new Date().toISOString();

      const [updated] = await supabaseFetch(`irvohm_leads?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });

      await logActivity({ userId: user.id, action: 'lead.status_changed', leadId: id, meta: { status: patch.status } });
      return res.status(200).json({ ok: true, lead: updated });
    }

    if (req.method === 'DELETE') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Seul un administrateur peut supprimer un lead.' });
      const id = req.query && req.query.id;
      if (!id) return res.status(400).json({ error: 'id manquant.' });
      await supabaseFetch(`irvohm_leads?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      await logActivity({ userId: user.id, action: 'lead.deleted', leadId: id });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('admin-leads error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
