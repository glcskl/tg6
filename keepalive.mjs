// Keep-alive пингер для Render (бесплатный тариф засыпает без входящих запросов).
// Запуск: node keepalive.mjs
// ENV: PING_URL (по умолчанию https://workdo.onrender.com/healthz),
//      PING_INTERVAL_MIN (по умолчанию 10).

const url = process.env.PING_URL ?? "https://workdo.onrender.com/healthz";
const intervalMs = (Number(process.env.PING_INTERVAL_MIN ?? 10) || 10) * 60 * 1000;

async function ping() {
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const ms = Date.now() - started;
    console.log(`[${new Date().toISOString()}] ${res.status} ${res.statusText} (${ms}ms)`);
  } catch (err) {
    console.log(`[${new Date().toISOString()}] ERR: ${err.message}`);
  }
}

console.log(`Keep-alive: ${url} every ${intervalMs / 60000} min  (Ctrl+C для остановки)`);
ping();
setInterval(ping, intervalMs);