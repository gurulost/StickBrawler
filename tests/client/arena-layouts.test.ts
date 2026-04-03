import test from "node:test";
import assert from "node:assert/strict";

import { getPlatformHeight, getPlatformsForLayout } from "../../client/src/game/Physics";
import { ARENA_THEMES, ARENA_OPTIONS } from "../../client/src/game/arenas";

test("arena catalog exposes five mechanically distinct stage identities", () => {
  assert.equal(ARENA_OPTIONS.length, 5);
  assert.equal(ARENA_THEMES.sunsetBloom.platformLayout, "classic");
  assert.equal(ARENA_THEMES.auroraFlux.platformLayout, "skybridge");
  assert.equal(ARENA_THEMES.crosswindVault.platformLayout, "scramble");
  assert.equal(ARENA_THEMES.longwatch.platformLayout, "runway");
  assert.equal(ARENA_THEMES.containment.platformLayout, "contained");
});

test("platform layouts produce distinct grounding routes at authored coordinates", () => {
  const classic = getPlatformsForLayout("classic");
  const skybridge = getPlatformsForLayout("skybridge");
  const scramble = getPlatformsForLayout("scramble");
  const runway = getPlatformsForLayout("runway");
  const contained = getPlatformsForLayout("contained");

  assert.equal(getPlatformHeight(0, -3, classic), 4);
  assert.equal(getPlatformHeight(0, 0, skybridge), 5.6);
  assert.equal(getPlatformHeight(0, 0, scramble), 4.9);
  assert.equal(getPlatformHeight(0, 0, runway), 5.1);
  assert.equal(getPlatformHeight(0, 0, contained), 4.6);

  assert.equal(getPlatformHeight(11, 0, classic), 0);
  assert.equal(getPlatformHeight(11, 0, skybridge), 4.1);
  assert.equal(getPlatformHeight(11, 0, runway), 2.4);
  assert.equal(getPlatformHeight(5, 0, scramble), 2.1);
  assert.equal(getPlatformHeight(5, 0, contained), 0);
});
