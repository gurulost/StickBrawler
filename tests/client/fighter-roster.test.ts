import test from "node:test";
import assert from "node:assert/strict";

import {
  FIGHTER_ROSTER,
  getFighterDefinition,
} from "../../client/src/combat/fighterRoster";
import {
  getMoveTableFor,
  resolveMoveFromIntent,
  type MoveKey,
} from "../../client/src/combat/moveTable";

test("fighter roster exposes four selectable archetypes with authored identity", () => {
  assert.equal(FIGHTER_ROSTER.length, 4);
  assert.deepEqual(
    FIGHTER_ROSTER.map((fighter) => fighter.id),
    ["stick_hero", "stick_villain", "stick_kite", "stick_anvil"],
  );
  assert.equal(getFighterDefinition("stick_kite").label, "Kite");
  assert.equal(getFighterDefinition("stick_kite").archetype, "Aerial");
  assert.equal(getFighterDefinition("stick_anvil").label, "Anvil");
  assert.equal(getFighterDefinition("stick_anvil").archetype, "Heavy");
});

test("kite move table resolves a distinct grounded, aerial, and recovery route set", () => {
  const kite = getMoveTableFor("stick_kite");

  assert.equal(
    resolveMoveFromIntent(kite, "attack:neutral:light:ground" as MoveKey),
    "kite_feather_jab",
  );
  assert.equal(
    resolveMoveFromIntent(kite, "attack:up:light:ground" as MoveKey),
    "kite_sky_hook",
  );
  assert.equal(
    resolveMoveFromIntent(kite, "attack:forward:light:air" as MoveKey),
    "kite_air_flick",
  );
  assert.equal(
    resolveMoveFromIntent(kite, "special:up:ground" as MoveKey),
    "kite_updraft_rise",
  );
  assert.equal(
    resolveMoveFromIntent(kite, "special:back:ground" as MoveKey),
    "kite_crosswind_feint",
  );
});

test("anvil move table resolves a heavy bruiser route set", () => {
  const anvil = getMoveTableFor("stick_anvil");

  assert.equal(
    resolveMoveFromIntent(anvil, "attack:neutral:light:ground" as MoveKey),
    "anvil_club_jab",
  );
  assert.equal(
    resolveMoveFromIntent(anvil, "attack:up:light:ground" as MoveKey),
    "anvil_headbutt_lift",
  );
  assert.equal(
    resolveMoveFromIntent(anvil, "attack:forward:light:air" as MoveKey),
    "anvil_air_lariat",
  );
  assert.equal(
    resolveMoveFromIntent(anvil, "special:forward:ground" as MoveKey),
    "anvil_bulldoze",
  );
  assert.equal(
    resolveMoveFromIntent(anvil, "special:up:ground" as MoveKey),
    "anvil_rising_crash",
  );
});
