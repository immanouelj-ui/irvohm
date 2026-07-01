const crypto = require('crypto');

const COOKIE_NAME = 'irvohm_admin';
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

function createSessionCookie() {
  const expires = Date.now() + SESSION_MAX_AGE_MS;
  const payload = String(expires);
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

function isAuthenticated(req) {
  if (!process.env.ADMIN_SESSION_SECRET) return false;
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  if (Date.now() > Number(payload)) return false;
  return safeEqual(sig, sign(payload));
}

module.exports = { createSessionCookie, clearSessionCookie, isAuthenticated, safeEqual, COOKIE_NAME };
