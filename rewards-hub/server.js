import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import crypto from 'crypto';

const defaultConfig = {
  port: Number(process.env.REWARDS_PORT || 4400),
  authToken: process.env.REWARDS_TOKEN || 'dev-rewards-token',
  minStake: Number(process.env.REWARDS_MIN_STAKE || 100),
  ttlMs: Number(process.env.REWARDS_REPORT_TTL_MS || 7 * 24 * 3600 * 1000),
  hmacSecret: process.env.REWARDS_HMAC_SECRET || '',
  rateLimitMax: Number(process.env.REWARDS_RATE_LIMIT_MAX || 120),
  rateLimitWindowMs: Number(process.env.REWARDS_RATE_LIMIT_WINDOW_MS || 60_000),
  logFormat: process.env.LOG_FORMAT || 'dev',
  bodyLimit: process.env.REWARDS_BODY_LIMIT || '256kb',
  referralSecret: process.env.REWARDS_REFERRAL_SECRET || '',
  referralBadgeThresholds: process.env.REWARDS_REFERRAL_THRESHOLDS || '1,3,5,10',
  friendAllowlist: process.env.FRIEND_NODE_ALLOWLIST || '',
};

export function buildConfig(overrides = {}) {
  const config = { ...defaultConfig, ...overrides };
  config.referralBadgeThresholds = parseThresholds(config.referralBadgeThresholds);
  config.friendAllowlist = parseList(config.friendAllowlist);
  return config;
}

export function createState() {
  return {
    reports: new Map(), // nodeId -> report
    badges: new Map(), // nodeId -> array of badges
    rateBuckets: new Map(),
    referredBy: new Map(), // nodeId -> referrerId
    referralCounts: new Map(), // referrerId -> count
  };
}

export function nowIso() {
  return new Date().toISOString();
}

export function computeScore(report) {
  const uptimePercent = Math.min(1, Math.max(0, Number(report.uptimePercent || 0)));
  const stake = Math.max(0, Number(report.stake || 0));
  const reputation = Number(report.reputation || 0);
  const deviceBoost = report.deviceBoost || 1;
  return uptimePercent * Math.log(1 + stake) * deviceBoost * (1 + reputation * 0.01);
}

export function badgeFor(report) {
  const badgesEarned = [];
  const uptimePercent = report.uptimePercent || 0;
  if (uptimePercent >= 0.99) badgesEarned.push('uptime-99');
  if (uptimePercent >= 0.9) badgesEarned.push('uptime-90');
  if ((report.deviceClass || '').includes('phone')) badgesEarned.push('mobile-hero');
  if (report.stake >= 1000) badgesEarned.push('staker-1k');
  return badgesEarned;
}

export function parseThresholds(value) {
  return Array.from(
    new Set(
      String(value)
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v) && v > 0),
    ),
  ).sort((a, b) => a - b);
}

export function parseList(value) {
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function pruneOld(reports, ttlMs, now = Date.now()) {
  for (const [nodeId, report] of reports.entries()) {
    const seenAt = Date.parse(report.at);
    if (!Number.isFinite(seenAt)) continue;
    if (now - seenAt > ttlMs) {
      reports.delete(nodeId);
    }
  }
}

export function verifySignature(req, secret) {
  if (!secret) return false;
  const provided = (req.headers['x-bulen-signature'] || '').toString();
  if (!provided) return false;
  const computed = crypto.createHmac('sha256', secret).update(req.rawBody || '').digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(computed, 'hex'));
  } catch (error) {
    return false;
  }
}

export function rateLimit(rateBuckets, ip, windowMs, max, now = Date.now()) {
  const bucket = rateBuckets.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  return bucket.count <= max;
}

export function addBadges(state, nodeId, earned) {
  if (!earned || !earned.length) return;
  state.badges.set(
    nodeId,
    Array.from(new Set([...(state.badges.get(nodeId) || []), ...earned])),
  );
}

export function buildReferralCode(nodeId, secret) {
  if (!secret) return '';
  const signature = crypto.createHmac('sha256', secret).update(nodeId).digest('hex');
  return `${nodeId}.${signature}`;
}

export function verifyReferralCode(code, secret) {
  if (!secret || !code) return null;
  const [referrerId, signature] = code.split('.');
  if (!referrerId || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(referrerId).digest('hex');
  if (expected !== signature) return null;
  return referrerId;
}

export function applyReferral(referrerId, nodeId, state, config, now = Date.now()) {
  if (!referrerId || !config.referralSecret) return;
  if (referrerId === nodeId) return;
  if (state.referredBy.has(nodeId)) return;
  state.referredBy.set(nodeId, referrerId);
  const count = (state.referralCounts.get(referrerId) || 0) + 1;
  state.referralCounts.set(referrerId, count);
  const thresholds = config.referralBadgeThresholds;
  const unlocked = thresholds
    .filter((t) => count >= t)
    .map((t) => `ambassador-${t}`);
  addBadges(state, referrerId, unlocked);
  addBadges(state, nodeId, ['referred']);
  addBadges(state, referrerId, ['referrer']);
  state.reports.set(nodeId, {
    ...(state.reports.get(nodeId) || {}),
    referredAt: new Date(now).toISOString(),
  });
}

export function isAllowedNode(nodeId, referrerId, config, state) {
  if (!config.friendAllowlist.length) return true;
  if (config.friendAllowlist.includes(nodeId)) return true;
  const ref = referrerId || state.referredBy.get(nodeId);
  if (ref && config.friendAllowlist.includes(ref)) return true;
  return false;
}

export function buildShareSignature(secret, payload) {
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function createApp(config = buildConfig(), state = createState()) {
  const app = express();
  app.use(cors());
  if (config.logFormat && config.logFormat !== 'none') {
    app.use(morgan(config.logFormat));
  }
  app.use(
    express.json({
      limit: config.bodyLimit,
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.post('/reports', (req, res) => {
    if (!config.authToken) {
      return res.status(500).json({ error: 'Hub misconfigured (no token)' });
    }
    if (!config.hmacSecret) {
      return res.status(500).json({ error: 'Hub misconfigured (no HMAC secret)' });
    }
    const token = req.headers['x-rewards-token'];
    if (token !== config.authToken) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!verifySignature(req, config.hmacSecret)) {
      return res.status(403).json({ error: 'Invalid signature' });
    }
    const referralCode = req.headers['x-referral-code'] || req.body?.referralCode;
    const referrerId = verifyReferralCode(String(referralCode || ''), config.referralSecret);
    if (!isAllowedNode(req.body?.nodeId, referrerId, config, state)) {
      return res.status(403).json({ error: 'Node not allowed (invite or allowlist required)' });
    }
    const ip =
      req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    if (
      !rateLimit(state.rateBuckets, ip, config.rateLimitWindowMs, config.rateLimitMax, Date.now())
    ) {
      return res.status(429).json({ error: 'Too many reports' });
    }
    const report = req.body || {};
    if (!report.nodeId) {
      return res.status(400).json({ error: 'Missing nodeId' });
    }
    if (Number(report.stake || 0) < config.minStake) {
      return res.status(400).json({ error: 'Stake below minimum' });
    }
    if (referrerId) {
      applyReferral(referrerId, report.nodeId, state, config, Date.now());
    }
    report.at = nowIso();
    report.score = computeScore(report);
    state.reports.set(report.nodeId, report);
    addBadges(state, report.nodeId, badgeFor(report));
    res.json({ ok: true, score: report.score, badges: state.badges.get(report.nodeId) || [] });
  });

  app.get('/leaderboard', (req, res) => {
    pruneOld(state.reports, config.ttlMs, Date.now());
    const entries = Array.from(state.reports.values())
      .map((entry) => ({
        ...entry,
        badges: state.badges.get(entry.nodeId) || [],
      }))
      .sort((a, b) => b.score - a.score);
    res.json({ count: entries.length, entries });
  });

  app.get('/badges/:nodeId', (req, res) => {
    res.json({ nodeId: req.params.nodeId, badges: state.badges.get(req.params.nodeId) || [] });
  });

  app.get('/referrals/code', (req, res) => {
    if (!config.referralSecret) return res.status(500).json({ error: 'Referrals disabled' });
    const token = req.headers['x-rewards-token'];
    if (token !== config.authToken) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const nodeId = req.query.nodeId?.toString() || '';
    if (!nodeId || !state.reports.has(nodeId)) {
      return res.status(400).json({ error: 'Unknown nodeId' });
    }
    res.json({ nodeId, code: buildReferralCode(nodeId, config.referralSecret) });
  });

  app.get('/share/:nodeId', (req, res) => {
    const nodeId = req.params.nodeId;
    const badges = state.badges.get(nodeId) || [];
    const payload = JSON.stringify({ nodeId, badges });
    const signature = buildShareSignature(config.referralSecret || config.hmacSecret, payload);
    res.json({ nodeId, badges, signature });
  });

  return app;
}

export function startServer(config = buildConfig(), state = createState()) {
  const app = createApp(config, state);
  const server = app.listen(config.port, () => {
    console.log(`Rewards hub listening on http://localhost:${config.port}`);
  });
  return { app, server, state };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
