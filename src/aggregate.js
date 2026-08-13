const PHOTO_PENALTY = 0.5;

export function recommend(bars, connoisseurs, reviews, options = {}) {
  const requireQuiet = options.requireQuiet ?? true;

  const trustById = new Map(connoisseurs.map((c) => [c.id, c.trust]));

  const eligibleBars = bars.filter(
    (b) => !requireQuiet || b.quiet === true
  );

  const byBar = new Map();

  for (const r of reviews) {
    if (!eligibleBars.some((b) => b.id === r.barId)) continue;
    if (!trustById.has(r.connoisseurId)) continue;

    const trust = trustById.get(r.connoisseurId);
    let entry = byBar.get(r.barId);
    if (!entry) {
      entry = { weightedSum: 0, weightSum: 0, reasons: [] };
      byBar.set(r.barId, entry);
    }
    entry.weightedSum += r.objective * trust;
    entry.weightSum += trust;
    entry.reasons.push({ connoisseurId: r.connoisseurId, trust });
  }

  const result = [];
  for (const b of eligibleBars) {
    const entry = byBar.get(b.id);
    if (!entry) continue;
    let score = entry.weightedSum / entry.weightSum;
    if (b.photoOriented) score -= PHOTO_PENALTY;
    result.push({ barId: b.id, score, reasons: entry.reasons });
  }

  result.sort((a, z) => z.score - a.score);
  return result;
}
