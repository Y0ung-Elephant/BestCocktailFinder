import { test } from "node:test";
import assert from "node:assert/strict";
import { recommend } from "./aggregate.js";

const bar = (overrides = {}) => ({
  id: "bar-1",
  name: "示例酒吧",
  city: "上海",
  area: "静安",
  style: "日式经典",
  quiet: true,
  photoOriented: false,
  ...overrides,
});

const connoisseur = (overrides = {}) => ({
  id: "c-1",
  trust: 1,
  ...overrides,
});

const review = (overrides = {}) => ({
  connoisseurId: "c-1",
  barId: "bar-1",
  subjective: 4,
  objective: 4,
  repeat: false,
  ...overrides,
});

test("single review returns the bar with its objective level as score", () => {
  const bars = [bar()];
  const connoisseurs = [connoisseur()];
  const reviews = [review()];

  const result = recommend(bars, connoisseurs, reviews);

  assert.equal(result.length, 1);
  assert.equal(result[0].barId, "bar-1");
  assert.equal(result[0].score, 4);
  assert.deepEqual(result[0].reasons, [{ connoisseurId: "c-1", trust: 1 }]);
});

test("multiple reviews weighted by trust level", () => {
  const bars = [bar()];
  const connoisseurs = [connoisseur({ id: "c-1", trust: 1 }), connoisseur({ id: "c-2", trust: 3 })];
  const reviews = [
    review({ connoisseurId: "c-1", objective: 4 }),
    review({ connoisseurId: "c-2", objective: 2 }),
  ];

  const result = recommend(bars, connoisseurs, reviews);

  // weighted mean: (4*1 + 2*3) / (1+3) = 10/4 = 2.5
  assert.equal(result[0].score, 2.5);
});

test("non-quiet bars are excluded by default", () => {
  const bars = [bar({ id: "loud-1", quiet: false })];
  const connoisseurs = [connoisseur()];
  const reviews = [review({ barId: "loud-1" })];

  const result = recommend(bars, connoisseurs, reviews);

  assert.equal(result.length, 0);
});

test("photoOriented bars are ranked below otherwise-equal bars", () => {
  const bars = [bar({ id: "plain-1" }), bar({ id: "photo-1", photoOriented: true })];
  const connoisseurs = [connoisseur()];
  const reviews = [
    review({ barId: "plain-1", objective: 5 }),
    review({ barId: "photo-1", objective: 5 }),
  ];

  const result = recommend(bars, connoisseurs, reviews);

  assert.equal(result[0].barId, "plain-1");
  assert.equal(result[1].barId, "photo-1");
  assert.ok(result[0].score > result[1].score);
});

test("bars with no reviews are omitted", () => {
  const bars = [bar({ id: "bar-1" }), bar({ id: "bar-2" })];
  const connoisseurs = [connoisseur()];
  const reviews = [review({ barId: "bar-1" })];

  const result = recommend(bars, connoisseurs, reviews);

  assert.equal(result.length, 1);
  assert.equal(result[0].barId, "bar-1");
});

test("reviews from unknown connoisseurs are ignored", () => {
  const bars = [bar()];
  const connoisseurs = [connoisseur({ id: "c-1", trust: 2 })];
  const reviews = [
    review({ connoisseurId: "c-1", objective: 4 }),
    review({ connoisseurId: "c-ghost", objective: 5 }),
  ];

  const result = recommend(bars, connoisseurs, reviews);

  assert.equal(result[0].score, 4);
});

test("requireQuiet option disables the quiet filter", () => {
  const bars = [bar({ id: "loud-1", quiet: false })];
  const connoisseurs = [connoisseur()];
  const reviews = [review({ barId: "loud-1" })];

  const result = recommend(bars, connoisseurs, reviews, { requireQuiet: false });

  assert.equal(result.length, 1);
  assert.equal(result[0].barId, "loud-1");
});
