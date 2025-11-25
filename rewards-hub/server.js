import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import crypto from 'crypto';

const port = Number(process.env.REWARDS_PORT || 4400);
const authToken = process.env.REWARDS_TOKEN || 'dev-rewards-token';
const minStake = Number(process.env.REWARDS_MIN_STAKE || 100);
const ttlMs = Number(process.env.REWARDS_REPORT_TTL_MS || 7 * 24 * 3600 * 1000);
const hmacSecret = process.env.REWARDS_HMAC_SECRET || '';
const rateLimitMax = Number(process.env.REWARDS_RATE_LIMIT_MAX || 120);
const rateLimitWindowMs = Number(process.env.REWARDS_RATE_LIMIT_WINDOW_MS || 60_000);

const reports = new Map(); // nodeId -> report
const badges = new Map(); // nodeId -> array of badges
const rateBuckets = new Map();

function nowIso() {
  return new Date().toISOString();
}

function computeScore(report) {
  const uptimePercent = Math.min(1, Math.max(0, Number(report.uptimePercent || 0)));
  const stake = Math.max(0, Number(report.stake || 0));
  const reputation = Number(report.reputation || 0);
  const deviceBoost = report.deviceBoost || 1;
  return uptimePercent * Math.log(1 + stake) * deviceBoost * (1 + reputation * 0.01);
}

function badgeFor(report) {
  const badgesEarned = [];
  const uptimePercent = report.uptimePercent || 0;
  if (uptimePercent >= 0.99) badgesEarned.push('uptime-99');
  if (uptimePercent >= 0.9) badgesEarned.push('uptime-90');
  if ((report.deviceClass || '').includes('phone')) badgesEarned.push('mobile-hero');
  if (report.stake >= 1000) badgesEarned.push('staker-1k');
  return badgesEarned;
}

function pruneOld() {
  const now = Date.now();
  for (const [nodeId, report] of reports.entries()) {
    if (now - Date.parse(report.at) > ttlMs) {
      reports.delete(nodeId);
    }
  }
}

const app = express();
app.use(cors());
app.use(morgan(process.env.LOG_FORMAT || 'dev'));
app.use(
  express.json({
    limit: '256kb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

function verifySignature(req) {
  if (!hmacSecret) return false;
  const provided = (req.headers['x-bulen-signature'] || '').toString();
  if (!provided) return false;
  const computed = crypto.createHmac('sha256', hmacSecret).update(req.rawBody || '').digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(computed, 'hex'));
  } catch (error) {
    return false;
  }
}

function rateLimit(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || { count: 0, resetAt: now + rateLimitWindowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + rateLimitWindowMs;
  }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  return bucket.count <= rateLimitMax;
}

app.post('/reports', (req, res) => {
  if (!authToken) {
    return res.status(500).json({ error: 'Hub misconfigured (no token)' });
  }
  if (!hmacSecret) {
    return res.status(500).json({ error: 'Hub misconfigured (no HMAC secret)' });
  }
  const token = req.headers['x-rewards-token'];
  if (token !== authToken) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!verifySignature(req)) {
    return res.status(403).json({ error: 'Invalid signature' });
  }
  const ip =
    req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many reports' });
  }
  const report = req.body || {};
  if (!report.nodeId) {
    return res.status(400).json({ error: 'Missing nodeId' });
  }
  if (Number(report.stake || 0) < minStake) {
    return res.status(400).json({ error: 'Stake below minimum' });
  }
  report.at = nowIso();
  report.score = computeScore(report);
  reports.set(report.nodeId, report);
  const earned = badgeFor(report);
  if (earned.length) {
    badges.set(report.nodeId, Array.from(new Set([...(badges.get(report.nodeId) || []), ...earned])));
  }
  res.json({ ok: true, score: report.score, badges: badges.get(report.nodeId) || [] });
});

app.get('/leaderboard', (req, res) => {
  pruneOld();
  const entries = Array.from(reports.values())
    .map((entry) => ({
      ...entry,
      badges: badges.get(entry.nodeId) || [],
    }))
    .sort((a, b) => b.score - a.score);
  res.json({ count: entries.length, entries });
});

app.get('/badges/:nodeId', (req, res) => {
  res.json({ nodeId: req.params.nodeId, badges: badges.get(req.params.nodeId) || [] });
});

app.listen(port, () => {
  console.log(`Rewards hub listening on http://localhost:${port}`);
});
