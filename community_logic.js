const DAY_MS = 24 * 60 * 60 * 1000;

// Lightweight dataset that powers the community layer and referral calculator.
const COMMUNITY_EVENTS = [
  {
    handle: 'validator-alpha',
    summary: '4 public gateways signed uptime receipts (<250ms latency).',
    mentorHours: 3,
    nodes: 4,
    impact: 3.6,
    timestamp: Date.now() - 1 * DAY_MS,
    type: 'infra',
  },
  {
    handle: 'docs-crew-pl',
    summary: 'Polish wallet FAQ + mobile pruning runbook merged.',
    mentorHours: 5,
    nodes: 1,
    impact: 2.4,
    timestamp: Date.now() - 3 * DAY_MS,
    type: 'docs',
  },
  {
    handle: 'meetup-krakow',
    summary: 'Krakow meetup: 12 wallets activated, 3 Pi nodes pledged.',
    mentorHours: 3,
    nodes: 3,
    impact: 2.9,
    timestamp: Date.now() - 5 * DAY_MS,
    type: 'community',
  },
  {
    handle: 'qa-squad',
    summary: 'Regression suite caught fork-check edge case; patch merged.',
    mentorHours: 1,
    nodes: 0,
    impact: 2.1,
    timestamp: Date.now() - 2 * DAY_MS,
    type: 'product',
  },
  {
    handle: 'edu-es',
    summary: 'Spanish onboarding deck updated; recorded 18 min walkthrough.',
    mentorHours: 4,
    nodes: 0,
    impact: 1.7,
    timestamp: Date.now() - 6 * DAY_MS,
    type: 'education',
  },
];

const ROLE_RATES = {
  product: { base: 0.08, bonus: 0.05 },
  infra: { base: 0.1, bonus: 0.07 },
  creator: { base: 0.06, bonus: 0.045 },
};

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  const n = toNumber(value, min);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function slugify(input) {
  const slug = String(input || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12);
  return slug || '';
}

function hashSegment(input) {
  let hash = 2166136261 >>> 0;
  const str = String(input || '');
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0)
    .toString(36)
    .toUpperCase()
    .slice(0, 6)
    .padStart(6, '0');
}

function buildCommunitySnapshot(events = COMMUNITY_EVENTS, now = Date.now()) {
  const windowStart = now - 14 * DAY_MS;
  const freshEvents = (events || []).filter((event) => {
    const ts = event && event.timestamp ? event.timestamp : now;
    return ts >= windowStart;
  });

  const activeHandles = new Set();
  let mentorHours = 0;
  let nodes = 0;

  freshEvents.forEach((event) => {
    if (!event) return;
    if (event.handle) activeHandles.add(event.handle);
    mentorHours += toNumber(event.mentorHours);
    nodes += toNumber(event.nodes);
  });

  const feed = [...freshEvents]
    .sort((a, b) => {
      if ((b.impact || 0) !== (a.impact || 0)) return (b.impact || 0) - (a.impact || 0);
      return (b.timestamp || 0) - (a.timestamp || 0);
    })
    .slice(0, 5)
    .map((event) => ({
      handle: event.handle || 'anon',
      summary: event.summary || '',
      impact: round(event.impact || 0, 1),
      type: event.type || 'general',
      timestamp: event.timestamp || now,
    }));

  return {
    stats: {
      contributors: activeHandles.size,
      mentorHours: round(mentorHours, 1),
      nodes: Math.max(0, Math.round(nodes)),
    },
    feed,
  };
}

function calculatePartnerPayout({
  role = 'product',
  leads = 0,
  conversionRate = 0,
  avgVolume = 0,
  uptime = 100,
} = {}) {
  const rates = ROLE_RATES[role] || ROLE_RATES.product;
  const leadsSafe = Math.max(0, toNumber(leads, 0));
  const conversion = clamp(conversionRate, 0, 100);
  const avg = Math.max(0, toNumber(avgVolume, 0));
  const uptimeSafe = clamp(uptime, 0, 100);
  if (!Number.isFinite(leadsSafe) || !Number.isFinite(conversion) || !Number.isFinite(avg)) {
    throw new Error('invalid-input');
  }

  const converted = leadsSafe * (conversion / 100);
  const grossVolume = converted * avg;
  const baseCut = grossVolume * rates.base;
  const reliabilityMultiplier =
    uptimeSafe <= 90 ? uptimeSafe / 100 : 0.9 + ((uptimeSafe - 90) / 10) * 0.2;
  const bonus = baseCut * rates.bonus * reliabilityMultiplier;
  const poolImpact = grossVolume * 0.02;

  return {
    monthlyPayout: round(baseCut + bonus),
    bonus: round(bonus),
    poolImpact: round(poolImpact),
    convertedDeals: round(converted, 2),
  };
}

function computeAgeMultiplier(ageDays = 0, offlineDays = 0) {
  const ageMonths = Math.max(0, toNumber(ageDays, 0)) / 30;
  const base = 1 + Math.min(0.5, 0.02 * ageMonths); // +2% per month, cap +50%
  const offlinePenaltyDays = Math.max(0, toNumber(offlineDays, 0) - 2); // grace for first 2 days
  const penalty = Math.max(0.5, 1 - offlinePenaltyDays * 0.03); // -3% per extra offline day, floor 0.5x
  return round(base * penalty, 3);
}

function computeLoyaltyMultiplier(loyaltyPercent = 0, loyaltyMonths = 0) {
  const pct = clamp(loyaltyPercent, 0, 50); // target 10–20%, hard cap 50
  const months = Math.max(0, toNumber(loyaltyMonths, 0));
  const maturityFactor = Math.min(1, months / 18); // full maturity after 18 months
  const percentFactor = pct / 20; // 20% committed unlocks full rate
  const boost = Math.min(0.5, percentFactor * maturityFactor * 0.5); // up to +50%
  return round(1 + boost, 3);
}

function projectLoyaltyAdjustedRewards(baseProjection = {}, multipliers = {}) {
  const age = multipliers.ageMultiplier || 1;
  const loyalty = multipliers.loyaltyMultiplier || 1;
  const factor = age * loyalty;
  const scale = (value) => (typeof value === 'number' ? round(value * factor, 4) : value);
  return {
    hourly: scale(baseProjection.hourly),
    daily: scale(baseProjection.daily),
    weekly: scale(baseProjection.weekly),
    periodTotal: scale(baseProjection.periodTotal || baseProjection.weekly),
    factor: round(factor, 3),
  };
}

function generateReferralCode(handle, contact = '', timestamp = Date.now()) {
  const slug = slugify(handle);
  if (!slug) {
    throw new Error('missing-handle');
  }
  const payload = `${slug}|${contact || 'anon'}|${timestamp}`;
  const digest = hashSegment(payload);
  return `BULEN-${slug}-${digest}`;
}

const api = {
  COMMUNITY_EVENTS,
  buildCommunitySnapshot,
  calculatePartnerPayout,
  computeAgeMultiplier,
  computeLoyaltyMultiplier,
  projectLoyaltyAdjustedRewards,
  generateReferralCode,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}

if (typeof window !== 'undefined') {
  window.BulenCommunity = api;
}
