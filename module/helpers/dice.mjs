/**
 * Caves of Qud Dice Rolling Module
 *
 * Implements penetration mechanics with exploding dice:
 * - Singlet rolls: 1d10-2 with exploding 8s
 * - Triplet evaluation: 3 singlets compared against target number
 * - Penetration resolution: Multiple triplets with PV reduction
 */

/**
 * Roll a single penetration die (1d10-2 with exploding 8s)
 *
 * Rolls 1d10-2. If the d10 shows an 8 (before the -2 modifier),
 * roll another 1d10-2 and add to the total. Continue indefinitely
 * while rolling 8s.
 *
 * @async
 * @returns {Promise<Object>} Singlet roll result
 * @returns {number} result.total - Final total after all explosions and -2 modifiers
 * @returns {Array<Object>} result.rolls - Array of {raw, modified} for each die
 * @returns {boolean} result.exploded - True if any explosions occurred
 * @returns {Array<number>} result.explosionChain - Array of raw die results for display
 *
 * @example
 * const singlet = await rollQudSinglet();
 * // { total: 13, rolls: [{raw: 8, modified: 6}, {raw: 8, modified: 6}, {raw: 3, modified: 1}], exploded: true, explosionChain: [8,8,3] }
 */
export async function rollQudSinglet() {
  let total = 0;
  let rolls = [];
  let continueRolling = true;

  while (continueRolling) {
    const roll = await new Roll("1d10").evaluate();
    const dieResult = roll.terms[0].results[0].result;
    const modified = dieResult - 2;

    rolls.push({ raw: dieResult, modified: modified });
    total += modified;

    // Per Qud wiki: "Each time that the maximum result of 8 is rolled"
    // Maximum result = 8 (which happens when raw die = 10)
    continueRolling = (modified === 8);  // Result is 8 (raw was 10)
  }

  return {
    total: total,
    rolls: rolls,
    exploded: rolls.length > 1,
    explosionChain: rolls.map(r => r.raw)
  };
}

/**
 * Roll a penetration triplet (3 singlets evaluated together)
 *
 * Rolls three singlets and compares each against the target number
 * (attacker PV - defender AV). If at least one singlet meets or exceeds
 * the target number, the triplet penetrates once. If all three succeed,
 * returns allPassed=true to trigger another triplet with reduced PV.
 *
 * @async
 * @param {number} attackerPV - Attacker's total penetration value (base + weapon)
 * @param {number} defenderAV - Defender's armor value
 * @returns {Promise<Object>} Triplet evaluation result
 * @returns {Array<Object>} result.singlets - Array of 3 singlet roll results
 * @returns {number} result.attackerPV - Attacker's PV for this triplet
 * @returns {number} result.defenderAV - Defender's AV
 * @returns {number} result.targetNumber - PV - AV (what singlets must beat)
 * @returns {number} result.singletsPassed - How many singlets >= target number
 * @returns {number} result.penetrations - 0 or 1 (1 if at least one singlet passed)
 * @returns {boolean} result.allPassed - True if all 3 singlets passed
 *
 * @example
 * const triplet = await rollQudTriplet(10, 6);
 * // { singlets: [...], targetNumber: 4, singletsPassed: 2, penetrations: 1, allPassed: false }
 */
export async function rollQudTriplet(attackerPV, defenderAV) {
  // Roll 3 singlets in parallel
  const singlets = await Promise.all([
    rollQudSinglet(),
    rollQudSinglet(),
    rollQudSinglet()
  ]);

  // Per Qud wiki: PV is ADDED to each singlet, then compared to AV
  // So: (singlet + PV) >= AV for each singlet
  const singletsPassed = singlets.filter(s => (s.total + attackerPV) >= defenderAV).length;

  return {
    singlets: singlets,
    attackerPV: attackerPV,
    defenderAV: defenderAV,
    targetNumber: defenderAV,  // What we're trying to beat (not PV-AV!)
    singletsPassed: singletsPassed,
    penetrations: singletsPassed > 0 ? 1 : 0,
    allPassed: singletsPassed === 3
  };
}

/**
 * Resolve complete penetration sequence (potentially multiple triplets)
 *
 * Rolls triplets until one fails or PV becomes ≤ 0. Each successful triplet
 * (where all 3 singlets pass) reduces the effective PV by 2 for the next triplet.
 * Returns the complete penetration result with all triplets rolled.
 *
 * @async
 * @param {number} attackerPV - Initial attacker PV (base + weapon)
 * @param {number} defenderAV - Defender's armor value
 * @returns {Promise<Object>} Complete penetration result
 * @returns {Array<Object>} result.triplets - All triplets rolled
 * @returns {number} result.totalPenetrations - Sum of penetrations from all triplets
 * @returns {number} result.initialPV - Starting PV
 * @returns {number} result.finalPV - PV after all reductions
 *
 * @example
 * const result = await resolvePenetration(10, 4);
 * // { triplets: [...], totalPenetrations: 3, initialPV: 10, finalPV: 4 }
 */
export async function resolvePenetration(attackerPV, defenderAV) {
  let currentPV = attackerPV;
  let totalPenetrations = 0;
  let triplets = [];
  let continueRolling = true;

  while (continueRolling && currentPV > 0) {
    const triplet = await rollQudTriplet(currentPV, defenderAV);
    triplets.push(triplet);
    totalPenetrations += triplet.penetrations;

    // If all 3 singlets passed, roll another triplet with PV-2
    // Otherwise, stop
    if (triplet.allPassed) {
      currentPV -= 2;
    } else {
      continueRolling = false;
    }
  }

  return {
    triplets: triplets,
    totalPenetrations: totalPenetrations,
    initialPV: attackerPV,
    finalPV: currentPV
  };
}
