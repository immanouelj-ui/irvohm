const crypto = require('crypto');
const { supabaseFetch } = require('./supabase');

const COOKIE_NAME = 'irvohm_session';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h

function sign(payload) {
  return crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(payload).digest('hex');
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createSessionCookie(userId) {
  const expires = Date.now() + SESSION_MAX_AGE_MS;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: expires })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';').filter(Boolean).map((pair) => {
      const idx = pair.indexOf('=');
      return [pair.slice(0, idx).trim(), decodeURIComponent(pair.slice(idx + 1).trim())];
    })
  );
}

function readSessionUserId(req) {
  if (!process.env.ADMIN_SESSION_SECRET) return null;
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;
  const idx = token.lastIndexOf('.');
  if (idx === -1) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!safeEqual(sig, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.uid || !data.exp || Date.now() > data.exp) return null;
    return data.uid;
  } catch {
    return null;
  }
}

/** Re-checks the DB on every call so deactivation / role changes take effect immediately. */
async function getCurrentUser(req) {
  const uid = readSessionUserId(req);
  if (!uid) return null;
  const rows = await supabaseFetch(`irvohm_users?id=eq.${encodeURIComponent(uid)}&select=id,email,name,role,active&limit=1`);
  const user = rows && rows[0];
  if (!user || !user.active) return null;
  return user;
}

module.exports = { createSessionCookie, clearSessionCookie, getCurrentUser, safeEqual, COOKIE_NAME };
