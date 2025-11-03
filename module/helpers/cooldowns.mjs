/**
 * Cooldown calculation helpers
 * Source: https://wiki.cavesofqud.com/wiki/Willpower
 */

import { CAVESOFQUD } from './config.mjs';

/**
 * Calculate effective cooldown after Willpower reduction
 *
 * @param {number} baseCooldown - Base cooldown in turns
 * @param {number} reductionPercent - Reduction percentage from Willpower (0-80)
 * @returns {number} Effective cooldown (minimum 5 rounds)
 *
 * Formula: max(5, baseCooldown × (1 - reductionPercent/100))
 */
export function calculateEffectiveCooldown(baseCooldown, reductionPercent) {
  const reduced = baseCooldown * (1 - reductionPercent / 100);
  return Math.max(CAVESOFQUD.baseValues.cooldownMinimum, Math.round(reduced));
}
