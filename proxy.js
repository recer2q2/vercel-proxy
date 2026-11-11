/*
 * CORS-проксі для плагіну UASerials — Vercel Function (Node.js).
 *
 * Призначення: сторінки сайтів (HTML) для плагіну у браузері / на ТВ, де сайт блокує запит через CORS.
 * НЕ призначений для відео: посилання на сегменти в m3u8 відносні й ламаються через проксі.
 *
 * Виклик:  GET https://<проєкт>.vercel.app/?url=<адреса>[&key=<TOKEN>]
 *          (vercel.json перенаправляє "/" на цю функцію; працює і /api/proxy?url=…)
 * Секрет (рекомендовано): змінна середовища TOKEN у налаштуваннях проєкту Vercel.
 */
const crypto = require('crypto');

// Дозволені цільові домени (разом із піддоменами) і Referer/Origin, які для них підставляються.
// Новий сайт додається сюди одним рядком.
const SITES = {
  'uaserials.com': 'https://uaserials.com/',
  'tortuga.tw': 'https://uaserials.com/',
  'tortuga.wtf': 'https://uaserials.com/',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': '*',
};

// повертає Referer для дозволеного домену або null
function refererFor(hostname) {
  for (const domain of Object.keys(SITES)) {
    if (hostname === domain || hostname.endsWith('.' + domain)) return SITES[domain];
  }
  return null;
}

function text(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(message);
}

// порівняння секрету без витоку за часом
function sameSecret(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = async function handler(req, res) {
  Object.keys(CORS).forEach((k) => res.setHeader(k, CORS[k]));
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'GET' && req.method !== 'HEAD') return text(res, 405, 'Method Not Allowed');

  const params = new URL(req.url, 'http://localhost').searchParams;
  const token = process.env.TOKEN;
  if (token && !sameSecret(params.get('key'), token)) return text(res, 401, 'Unauthorized');

  let target;
  try { target = new URL(params.get('url') || ''); } catch (e) { return text(res, 400, 'Bad url'); }
  if (target.protocol !== 'https:') return text(res, 400, 'Only https');

  const referer = refererFor(target.hostname);
  if (!referer) return text(res, 403, 'Host not allowed: ' + target.hostname);

  try {
    const upstream = await fetch(target.toString(), {
      method: req.method,
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'uk-UA,uk;q=0.9',
        'Referer': referer,
        'Origin': referer.replace(/\/$/, ''),
      },
    });

    // після редиректів кінцевий хост теж має бути дозволеним
    if (upstream.url && !refererFor(new URL(upstream.url).hostname)) {
      return text(res, 403, 'Redirect to a host that is not allowed');
    }

    const body = Buffer.from(await upstream.arrayBuffer()); // fetch уже розпакував тіло
    res.statusCode = upstream.status;
    const type = upstream.headers.get('content-type');
    if (type) res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-store');
    // content-encoding/content-length/set-cookie навмисно не передаються
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (e) {
    text(res, 502, 'Upstream error: ' + (e && e.name === 'TimeoutError' ? 'timeout' : 'fetch failed'));
  }
};
