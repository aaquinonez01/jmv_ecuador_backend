// Prueba de estrés del Quiz en vivo: simula N jóvenes jugando a la vez.
//
// Uso (desde la carpeta del backend):
//   node scripts/stress/quiz-stress.mjs
// Variables de entorno:
//   API=https://api.jmvecuador.org/api   (por defecto http://localhost:3002/api)
//   PLAYERS=150  QUESTIONS=10  SECONDS=20
//   MODE=realista|rafaga                  (rafaga: todos responden en el mismo segundo)
//   CHAOS=1                               (corta la conexión a un 10 % a mitad del juego)
//   ADMIN_EMAIL / ADMIN_PASSWORD          (cuenta administradora)
//   JWT_SECRET=...                        (solo local: firma los tokens sin iniciar sesión)
//   SOCKET_IO=ruta/a/socket.io-client     (por defecto, el de la app móvil)
//
// Las cuentas de prueba se llaman estres-NNN@prueba.jmvecuador.org. Los tokens se guardan
// en scripts/stress/.tokens-<host>.json para no tener que iniciar sesión cada vez
// (el inicio de sesión está limitado a 10 por minuto por IP).
//
// Al terminar todas las pruebas: DELETE /api/quiz-sessions/stress-data (admin)
// borra las cuentas estres-NNN y los quizzes "[PRUEBA DE ESTRÉS]".
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { io } = require(process.env.SOCKET_IO ?? 'C:/proyectos/jmv/jmv-app-mobile/node_modules/socket.io-client');

const API = (process.env.API ?? 'http://localhost:3002/api').replace(/\/+$/, '');
const WS = API.replace(/\/api$/, '') + '/quiz';
const PLAYERS = Number(process.env.PLAYERS ?? 100);
const QUESTIONS = Number(process.env.QUESTIONS ?? 10);
const SECONDS = Number(process.env.SECONDS ?? 20);
const MODE = process.env.MODE ?? 'realista';
const CHAOS = process.env.CHAOS === '1';
const PASSWORD = 'EstresJmv2026';
const host = new URL(API).host.replace(/[^a-z0-9.]/gi, '_');
const TOKENS_FILE = path.join(here, `.tokens-${host}.json`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]);
};
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function http(method, p, token, body) {
  const r = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}

// ── Tokens ────────────────────────────────────────────────────────────────
function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
async function signJwt(payload, secret) {
  const crypto = await import('node:crypto');
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + 6 * 3600 }));
  const sig = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${head}.${body}.${sig}`;
}
const tokenExp = (t) => {
  try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64').toString()).exp * 1000; } catch { return 0; }
};

async function prepareUsers(adminToken) {
  const cache = fs.existsSync(TOKENS_FILE) ? JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')) : {};
  const users = [];
  for (let i = 1; i <= PLAYERS; i++) {
    const email = `estres-${String(i).padStart(3, '0')}@prueba.jmvecuador.org`;
    if (cache[email] && tokenExp(cache[email].token) > Date.now() + 2 * 3600_000) {
      users.push({ email, ...cache[email] });
      continue;
    }
    const created = await http('POST', '/points/admin/members', adminToken, {
      fullName: `Prueba Estrés ${String(i).padStart(3, '0')}`,
      displayName: `Estrés ${i}`,
      email,
      password: PASSWORD,
    });
    let id = created.data?.member?.id;
    let token;
    if (process.env.JWT_SECRET) {
      if (!id) {
        const list = await http('GET', `/points/admin/members?search=${encodeURIComponent(email)}`, adminToken);
        id = list.data?.items?.find((m) => m.email === email)?.id;
      }
      token = await signJwt({ id, email, role: 'user' }, process.env.JWT_SECRET);
    } else {
      // Producción: inicio de sesión real, respetando el límite de 10 por minuto
      for (;;) {
        const login = await http('POST', '/auth/login', null, { email, password: PASSWORD });
        if (login.status === 201 || login.status === 200) {
          token = login.data.token;
          id = login.data.user?.id ?? id;
          break;
        }
        if (login.status === 429) { log(`límite de inicio de sesión: espero 65 s (${i}/${PLAYERS})`); await sleep(65_000); continue; }
        throw new Error(`login ${email}: ${login.status} ${JSON.stringify(login.data)}`);
      }
      await sleep(6_500);
    }
    cache[email] = { id, token };
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(cache));
    users.push({ email, id, token });
    if (i % 25 === 0) log(`cuentas listas: ${i}/${PLAYERS}`);
  }
  return users;
}

// ── Juego ─────────────────────────────────────────────────────────────────
async function main() {
  log(`API=${API} jugadores=${PLAYERS} preguntas=${QUESTIONS}x${SECONDS}s modo=${MODE}${CHAOS ? ' +caos' : ''}`);
  const admin = await http('POST', '/auth/login', null, {
    email: process.env.ADMIN_EMAIL ?? 'admin@jmv.local',
    password: process.env.ADMIN_PASSWORD ?? 'JmvLocal2026!',
  });
  if (!admin.data?.token) throw new Error('No se pudo iniciar sesión como administrador: ' + JSON.stringify(admin.data));
  const adminToken = admin.data.token;

  const users = await prepareUsers(adminToken);
  log(`${users.length} cuentas de prueba listas`);

  // Quiz de prueba: la correcta en una posición al azar
  const correctByOrder = new Map();
  const questions = Array.from({ length: QUESTIONS }, (_, q) => {
    const correct = Math.floor(Math.random() * 4);
    correctByOrder.set(q + 1, correct);
    return {
      prompt: `[PRUEBA DE ESTRÉS] Pregunta ${q + 1}`,
      order: q + 1,
      options: [0, 1, 2, 3].map((o) => ({ text: `Opción ${o + 1}`, order: o + 1, isCorrect: o === correct })),
    };
  });
  const quiz = await http('POST', '/quizzes', adminToken, {
    title: `[PRUEBA DE ESTRÉS] ${new Date().toISOString().slice(0, 16)}`,
    category: 'Prueba', difficulty: 'Fácil', secondsPerQuestion: SECONDS, maxPlayers: PLAYERS + 10, questions,
  });
  if (!quiz.data?.id) throw new Error('No se pudo crear el quiz: ' + JSON.stringify(quiz.data));
  const session = await http('POST', `/quizzes/${quiz.data.id}/sessions`, adminToken, { secondsPerQuestion: SECONDS, maxPlayers: PLAYERS + 10 });
  if (!session.data?.id) throw new Error('No se pudo crear la sala: ' + JSON.stringify(session.data));
  const { id: sessionId, roomCode } = session.data;
  log(`sala ${roomCode} creada`);

  const stats = {
    connectMs: [], joinMs: [], connectFail: 0, joinFail: [], ackMs: [], answerErrors: {}, disconnects: 0, reconnects: 0,
    skew: [], answered: 0, closed: [], confirmed: new Map(), metrics: [],
  };
  const received = new Map(); // questionId -> [tiempos de llegada]

  const connect = (token) => new Promise((resolve, reject) => {
    const t0 = performance.now();
    const s = io(WS, { auth: { token }, transports: ['websocket'], reconnectionDelayMax: 8000, randomizationFactor: 0.5 });
    const timer = setTimeout(() => { s.close(); reject(new Error('timeout')); }, 15000);
    s.once('connect', () => { clearTimeout(timer); stats.connectMs.push(performance.now() - t0); resolve(s); });
    s.once('connect_error', (e) => { clearTimeout(timer); s.close(); reject(e); });
  });
  const emitAck = (s, ev, payload, timeout = 8000) => new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('ACK_TIMEOUT')), timeout);
    s.emit(ev, payload, (res) => { clearTimeout(t); resolve(res); });
  });

  // 1) Conexión escalonada (como un salón llenándose) en ~10 s
  const players = [];
  await Promise.all(users.map(async (u, i) => {
    await sleep((i / users.length) * 10_000);
    let s;
    try { s = await connect(u.token); } catch { stats.connectFail++; return; }
    const p = { ...u, s, score: 0 };
    s.on('disconnect', () => stats.disconnects++);
    s.io.on('reconnect', () => {
      stats.reconnects++;
      // Sin recuperación automática, la app vuelve a unirse
      if (!s.recovered) s.emit('session.join', { sessionId, roomCode, asPlayer: true }, () => {});
    });
    s.on('question.started', (ev) => onQuestion(p, ev));
    const t0 = performance.now();
    try {
      const snap = await emitAck(s, 'session.join', { sessionId, roomCode, asPlayer: true }, 15000);
      if (snap?.ok === false) throw new Error(snap.code);
      stats.joinMs.push(performance.now() - t0);
      players.push(p);
    } catch (e) { stats.joinFail.push(e.message); }
  }));
  log(`conectados ${players.length}/${users.length} (fallos de conexión ${stats.connectFail}, de ingreso ${stats.joinFail.length})`);

  function onQuestion(p, ev) {
    const now = performance.now();
    const arr = received.get(ev.question.id) ?? [];
    arr.push(now);
    received.set(ev.question.id, arr);
    if (Math.random() < 0.05) return; // 5 % no responde
    const delay = MODE === 'rafaga' ? Math.random() * 300 : 800 + Math.random() * Math.min(14_000, SECONDS * 1000 - 1500);
    const correct = correctByOrder.get(ev.question.order);
    const pick = Math.random() < 0.6 ? correct : (correct + 1 + Math.floor(Math.random() * 3)) % 4;
    setTimeout(async () => {
      const t0 = performance.now();
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await emitAck(p.s, 'question.answer', {
            sessionId, questionId: ev.question.id, optionId: ev.question.options[pick].id, elapsedMs: Math.round(performance.now() - now),
          });
          if (res?.ok === false) { stats.answerErrors[res.code] = (stats.answerErrors[res.code] ?? 0) + 1; return; }
          stats.ackMs.push(performance.now() - t0);
          stats.answered++;
          p.score += res.points;
          return;
        } catch (e) {
          if (attempt === 2) stats.answerErrors[e.message] = (stats.answerErrors[e.message] ?? 0) + 1;
        }
      }
    }, delay);
  }

  // 2) El anfitrión (panel web) entra y arranca
  const hostSocket = await connect(adminToken);
  await emitAck(hostSocket, 'session.join', { sessionId, roomCode });
  let finished;
  const done = new Promise((r) => (finished = r));
  let qn = 0;
  hostSocket.on('question.closed', (ev) => {
    stats.closed.push({ answered: ev.answeredCount, of: ev.participantCount });
    const arr = received.get(ev.questionId) ?? [];
    if (arr.length) stats.skew.push(Math.max(...arr) - Math.min(...arr));
    log(`pregunta ${++qn}: ${ev.answeredCount}/${ev.participantCount} respondieron · llegó a ${arr.length} celulares en ${Math.round(stats.skew.at(-1) ?? 0)} ms`);
    http('GET', '/quiz-sessions/metrics', adminToken).then((m) => m.status === 200 && stats.metrics.push(m.data)).catch(() => {});
  });
  hostSocket.on('session.finished', finished);

  if (CHAOS) {
    // A mitad del juego, a un 10 % se le cae la conexión unos segundos
    setTimeout(() => {
      const victims = players.slice(0, Math.max(1, Math.round(players.length * 0.1)));
      log(`caos: corto la conexión a ${victims.length} jugadores`);
      for (const v of victims) v.s.io.engine.close();
    }, (SECONDS * QUESTIONS * 1000) / 2);
  }

  const tStart = Date.now();
  const start = await http('POST', `/quiz-sessions/${sessionId}/start`, adminToken);
  if (start.status >= 300) throw new Error('No arrancó: ' + JSON.stringify(start.data));
  log('¡quiz iniciado!');

  const fin = await Promise.race([done, sleep((SECONDS + 15) * QUESTIONS * 1000).then(() => null)]);
  const total = Math.round((Date.now() - tStart) / 1000);

  // 3) Consistencia: el puntaje final de cada uno = suma de lo que el servidor le confirmó
  let mismatches = 0;
  if (fin) {
    const byId = new Map(fin.ranking.map((r) => [r.userId, r.score]));
    for (const p of players) if ((byId.get(p.id) ?? 0) !== p.score) mismatches++;
  }

  const lag = stats.metrics.map((m) => m.eventLoopLagMs?.p99 ?? 0);
  const report = {
    jugadores: { pedidos: PLAYERS, conectados: players.length, falloConexion: stats.connectFail, falloIngreso: stats.joinFail.length },
    conexionMs: { p50: pct(stats.connectMs, 50), p95: pct(stats.connectMs, 95) },
    ingresoMs: { p50: pct(stats.joinMs, 50), p95: pct(stats.joinMs, 95) },
    llegadaPreguntaDesfaseMs: { p50: pct(stats.skew, 50), max: pct(stats.skew, 100) },
    confirmacionRespuestaMs: { p50: pct(stats.ackMs, 50), p95: pct(stats.ackMs, 95), p99: pct(stats.ackMs, 99), max: pct(stats.ackMs, 100) },
    respuestasConfirmadas: stats.answered,
    erroresRespuesta: stats.answerErrors,
    desconexiones: stats.disconnects,
    reconexiones: stats.reconnects,
    terminoBien: !!fin,
    puntajesQueNoCuadran: mismatches,
    servidor: {
      retrasoNodeP99Ms: lag.length ? Math.max(...lag) : null,
      memoriaMb: stats.metrics.length ? Math.max(...stats.metrics.map((m) => m.memoryMb)) : null,
    },
    duracionS: total,
  };
  console.log('\n══════ INFORME ══════\n' + JSON.stringify(report, null, 2));

  for (const p of players) p.s.close();
  hostSocket.close();
  if (process.env.KEEP !== '1') await http('DELETE', `/quiz-sessions/${sessionId}`, adminToken).catch(() => {});
  else log(`sala conservada: ${roomCode}`);
  process.exit(report.terminoBien && mismatches === 0 && players.length === PLAYERS ? 0 : 1);
}

main().catch((e) => { console.error('ERROR', e); process.exit(2); });
