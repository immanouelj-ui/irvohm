const crypto = require('crypto');
const { getCurrentUser } = require('./_lib/auth');
const { supabaseFetch } = require('./_lib/supabase');
const { logActivity } = require('./_lib/activity');

const BUCKET = 'lead-documents';
const MAX_BYTES = 3 * 1024 * 1024; // 3MB (encodé en base64 ça reste sous la limite de 4.5MB du body Vercel)

function storageHeaders(extra) {
  return {
    apikey: process.env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
    ...extra,
  };
}

async function signUrl(path) {
  const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn: 60 * 10 }),
  });
  if (!res.ok) throw new Error(`Storage sign ${res.status}`);
  const data = await res.json();
  return `${process.env.SUPABASE_URL}/storage/v1${data.signedURL}`;
}

module.exports = async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié.' });

  try {
    if (req.method === 'GET') {
      const leadId = req.query && req.query.lead_id;
      if (!leadId) return res.status(400).json({ error: 'lead_id manquant.' });
      const docs = await supabaseFetch(
        `irvohm_lead_documents?lead_id=eq.${encodeURIComponent(leadId)}&select=*,uploader:irvohm_users!uploaded_by(name,email)&order=created_at.desc`
      );
      const withUrls = await Promise.all(
        docs.map(async (d) => ({ ...d, url: await signUrl(d.storage_path).catch(() => null) }))
      );
      return res.status(200).json({ documents: withUrls });
    }

    if (req.method === 'POST') {
      const { lead_id, file_name, mime_type, data_base64 } = req.body || {};
      if (!lead_id || !file_name || !data_base64) {
        return res.status(400).json({ error: 'lead_id, file_name et data_base64 requis.' });
      }

      const buffer = Buffer.from(data_base64, 'base64');
      if (buffer.length > MAX_BYTES) {
        return res.status(413).json({ error: 'Fichier trop volumineux (3 Mo max).' });
      }

      const safeName = String(file_name).replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${lead_id}/${crypto.randomUUID()}_${safeName}`;

      const uploadRes = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
        method: 'POST',
        headers: storageHeaders({ 'Content-Type': mime_type || 'application/octet-stream' }),
        body: buffer,
      });
      if (!uploadRes.ok) {
        const text = await uploadRes.text().catch(() => '');
        throw new Error(`Storage upload ${uploadRes.status}: ${text}`);
      }

      const [doc] = await supabaseFetch('irvohm_lead_documents', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          lead_id,
          uploaded_by: user.id,
          file_name: safeName,
          storage_path: storagePath,
          mime_type: mime_type || null,
          size_bytes: buffer.length,
        }),
      });

      await logActivity({ userId: user.id, action: 'lead.document_uploaded', leadId: lead_id, meta: { file_name: safeName } });

      return res.status(200).json({ ok: true, document: { ...doc, url: await signUrl(storagePath).catch(() => null) } });
    }

    if (req.method === 'DELETE') {
      const id = req.query && req.query.id;
      if (!id) return res.status(400).json({ error: 'id manquant.' });

      const rows = await supabaseFetch(`irvohm_lead_documents?id=eq.${encodeURIComponent(id)}&select=storage_path,lead_id`);
      const doc = rows && rows[0];
      if (!doc) return res.status(404).json({ error: 'Document introuvable.' });

      await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
        method: 'DELETE',
        headers: storageHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ prefixes: [doc.storage_path] }),
      });
      await supabaseFetch(`irvohm_lead_documents?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });

      await logActivity({ userId: user.id, action: 'lead.document_deleted', leadId: doc.lead_id });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('admin-documents error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
