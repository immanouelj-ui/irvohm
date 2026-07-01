const { supabaseFetch } = require('./supabase');

async function logActivity({ userId, action, leadId, meta }) {
  try {
    await supabaseFetch('irvohm_activity_log', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId || null,
        action,
        lead_id: leadId || null,
        meta: meta || {},
      }),
    });
  } catch (err) {
    console.error('logActivity failed:', err);
  }
}

module.exports = { logActivity };
