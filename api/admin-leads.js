/*
 * Regroupe leads / notes / documents / import dans une seule fonction serverless
 * pour rester sous la limite de 12 fonctions du plan Vercel Hobby.
 * Ressource choisie via ?resource=lead|note|document|import (lead par défaut).
 */
const crypto = require('crypto');
const { getCurrentUser } = require('./_lib/auth');
const { supabaseFetch } = require('./_lib/supabase');
const { logActivity } = require('./_lib/activity');

const ALLOWED_STATUSES = ['nouveau', 'contacte', 'devis_envoye', 'gagne', 'perdu'];
const BUCKET = 'lead-documents';
const MAX_DOC_BYTES = 3 * 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;

/* ================= LEADS ================= */
async function handleLead(req, res, user) {
  if (req.method === 'GET') {
    const leads = await supabaseFetch(
      'irvohm_leads?select=*,created_by_user:irvohm_users!created_by(name,email)&order=created_at.desc'
    );
    return res.status(200).json({ leads });
  }

  if (req.method === 'POST') {
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
}

/* ================= NOTES ================= */
async function handleNote(req, res, user) {
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
}

/* ================= DOCUMENTS ================= */
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

async function handleDocument(req, res, user) {
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
    if (buffer.length > MAX_DOC_BYTES) {
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
}

/* ================= IMPORT ================= */
async function handleImport(req, res, user) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const rows = Array.isArray(req.body && req.body.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'Aucune ligne à importer.' });
  if (rows.length > MAX_IMPORT_ROWS) return res.status(400).json({ error: `Maximum ${MAX_IMPORT_ROWS} lignes par import.` });

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
}

/* ================= DISPATCH ================= */
module.exports = async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié.' });

  const resource = (req.query && req.query.resource) || 'lead';

  try {
    if (resource === 'lead') return await handleLead(req, res, user);
    if (resource === 'note') return await handleNote(req, res, user);
    if (resource === 'document') return await handleDocument(req, res, user);
    if (resource === 'import') return await handleImport(req, res, user);
    return res.status(400).json({ error: 'Ressource inconnue.' });
  } catch (err) {
    console.error('admin-leads error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
