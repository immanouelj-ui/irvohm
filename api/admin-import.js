const { getCurrentUser } = require('./_lib/auth');
const { supabaseFetch } = require('./_lib/supabase');
const { logActivity } = require('./_lib/activity');

const ALLOWED_STATUSES = ['nouveau', 'contacte', 'devis_envoye', 'gagne', 'perdu'];
const MAX_ROWS = 1000;

module.exports = async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié.' });

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const rows = Array.isArray(req.body && req.body.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'Aucune ligne à importer.' });
  if (rows.length > MAX_ROWS) return res.status(400).json({ error: `Maximum ${MAX_ROWS} lignes par import.` });

  let created = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const nom = String(row.nom || '').trim();
    if (!nom) { skipped++; continue; }

    try {
      const [lead] = await supabaseFetch('irvohm_leads', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          nom,
          email: String(row.email || '').trim() || null,
          telephone: String(row.telephone || '').trim() || null,
          code_postal: row.code_postal || null,
          adresse: row.adresse || null,
          status: ALLOWED_STATUSES.includes(row.status) ? row.status : 'nouveau',
          source: 'import',
          created_by: user.id,
        }),
      });

      const noteText = String(row.notes || '').trim();
      if (noteText) {
        await supabaseFetch('irvohm_lead_notes', {
          method: 'POST',
          body: JSON.stringify({ lead_id: lead.id, author_id: user.id, body: noteText }),
        });
      }
      created++;
    } catch (err) {
      errors.push({ row: i + 1, error: err.message });
    }
  }

  await logActivity({ userId: user.id, action: 'lead.imported', meta: { created, skipped, failed: errors.length } });

  return res.status(200).json({ ok: true, created, skipped, errors });
};
