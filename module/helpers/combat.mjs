/**
 * Caves of Qud Combat Resolution Module
 *
 * Orchestrates multi-weapon attack sequences:
 * - Attack validation
 * - Main hand and offhand attack execution
 * - Combat chat message generation
 * - Damage application
 */

import { getWieldingBodyParts, canWieldWeapon, getBodyPartDisplayName } from './bodyparts.mjs';
import { resolvePenetration } from './dice.mjs';

/**
 * Validate that an actor can perform attacks
 *
 * @param {Actor} actor - Actor to validate
 * @throws {Error} If validation fails
 */
export function validateAttacker(actor) {
  // Must have at least one part with a weapon (equipped OR natural)
  const partsWithWeapons = [];

  for (let [partId, part] of Object.entries(actor.system.bodyParts)) {
    const hasEquippedWeapon = part.equipment && actor.items.get(part.equipment)?.type === 'weapon';
    const hasNaturalWeapon = !!actor.getNaturalWeapon(partId);

    if (hasEquippedWeapon || hasNaturalWeapon) {
      partsWithWeapons.push({ id: partId, ...part });
    }
  }

  if (partsWithWeapons.length === 0) {
    throw new Error("Actor has no weapons (equipped or natural)");
  }

  // If multiple parts with weapons exist, must have main hand designated
  if (partsWithWeapons.length > 1 && !actor.system.combat.mainHandId) {
    throw new Error("Must designate a main hand before attacking with multiple weapons");
  }

  return true;
}

/**
 * Validate main hand designation
 *
 * @param {Actor} actor - Actor document
 * @param {string} bodyPartId - Body part ID to validate
 * @throws {Error} If validation fails
 */
export function validateMainHandId(actor, bodyPartId) {
  // Must be valid body part ID
  const part = actor.system.bodyParts[bodyPartId];
  if (!part) {
    throw new Error("Invalid body part ID");
  }

  // Must have weapon (equipped OR natural) - F005
  const hasEquippedWeapon = part.equipment && actor.items.get(part.equipment)?.type === 'weapon';
  const hasNaturalWeapon = !!actor.getNaturalWeapon(bodyPartId);

  if (!hasEquippedWeapon && !hasNaturalWeapon) {
    throw new Error("Body part must have a weapon (equipped or natural)");
  }

  return true;
}

/**
 * Execute single hand's attack sequence (to-hit → penetration → damage)
 *
 * @async
 * @param {Item} weapon - Weapon item document
 * @param {Actor} attacker - Attacking actor
 * @param {Actor} target - Target actor
 * @param {string} bodyPartId - ID of attacking body part
 * @returns {Promise<Object>} Hand attack result
 */
export async function executeHandAttack(weapon, attacker, target, bodyPartId) {
  const bodyPart = attacker.system.bodyParts[bodyPartId];
  const bodyPartName = getBodyPartDisplayName(bodyPart);

  // Phase 1: To-hit roll (1d20 + AGI modifier vs DV)
  const agiMod = attacker.system.attributes.agility.mod;
  const toHitFormula = `1d20 + ${agiMod}`;
  const toHitRoll = await new Roll(toHitFormula).evaluate();
  const toHitTotal = toHitRoll.total;
  const targetDV = target.system.combat.dv;
  const hit = toHitTotal >= targetDV;

  const result = {
    bodyPartId: bodyPartId,
    bodyPartName: bodyPartName,
    weaponId: weapon.id,
    weaponName: weapon.name,
    weaponDamage: weapon.system.damage,
    weaponPV: weapon.system.pv || 0,  // Store weapon PV for display
    toHitRoll: toHitRoll,
    toHitTotal: toHitTotal,
    targetDV: targetDV,
    hit: hit
  };

  // If miss, stop here
  if (!hit) {
    return result;
  }

  // Phase 2: Penetration resolution
  const attackerPV = attacker.system.combat.pv + (weapon.system.pv || 0);
  const defenderAV = target.system.combat.av;
  const penetration = await resolvePenetration(attackerPV, defenderAV);

  result.penetration = penetration;

  // If no penetrations, stop here (no damage)
  if (penetration.totalPenetrations === 0) {
    result.damageRolls = [];
    result.totalDamage = 0;
    return result;
  }

  // Phase 3: Damage calculation (roll weapon damage once per penetration)
  const damageRolls = [];
  let totalDamage = 0;

  for (let i = 0; i < penetration.totalPenetrations; i++) {
    const damageRoll = await new Roll(weapon.system.damage).evaluate();
    damageRolls.push(damageRoll);
    totalDamage += damageRoll.total;
  }

  result.damageRolls = damageRolls;
  result.totalDamage = totalDamage;

  return result;
}

/**
 * Check offhand attack percentage and execute if triggered
 *
 * @async
 * @param {Item} weapon - Weapon item document
 * @param {Actor} attacker - Attacking actor
 * @param {Actor} target - Target actor
 * @param {string} bodyPartId - ID of attacking body part
 * @param {number} offhandChance - Percentage chance (0-100)
 * @returns {Promise<Object>} Offhand attack result with percentage check
 */
export async function executeOffhandAttack(weapon, attacker, target, bodyPartId, offhandChance) {
  const bodyPart = attacker.system.bodyParts[bodyPartId];
  const bodyPartName = getBodyPartDisplayName(bodyPart);

  // Roll percentage check (1d100)
  const percentRoll = await new Roll('1d100').evaluate();
  const percentResult = percentRoll.total;
  const triggered = percentResult <= offhandChance;

  const result = {
    bodyPartId: bodyPartId,
    bodyPartName: bodyPartName,
    weaponId: weapon.id,
    weaponName: weapon.name,
    weaponDamage: weapon.system.damage,
    offhandChance: offhandChance,
    percentRoll: percentRoll,
    percentResult: percentResult,
    triggered: triggered
  };

  // If offhand doesn't trigger, stop here
  if (!triggered) {
    return result;
  }

  // If triggered, execute full attack sequence
  const attackResult = await executeHandAttack(weapon, attacker, target, bodyPartId);

  // Merge attack result into offhand result
  return {
    ...result,
    ...attackResult
  };
}

/**
 * Execute complete multi-weapon attack sequence
 * Handles main hand attacks and offhand percentage checks
 *
 * @async
 * @param {Actor} attacker - The attacking actor
 * @param {Actor} target - The target actor
 * @returns {Promise<Object>} Complete attack results
 */
export async function executeMultiWeaponAttack(attacker, target) {
  // Get main hand
  const mainHand = attacker.getMainHand();
  if (!mainHand) {
    throw new Error("No main hand designated");
  }

  // Get equipped weapon or natural weapon (F005)
  const mainHandWeapon = mainHand.equipment ?
    attacker.items.get(mainHand.equipment) :
    attacker.getNaturalWeapon(mainHand.id);

  if (!mainHandWeapon) {
    throw new Error("Main hand has no weapon (equipped or natural)");
  }

  // Store HP before attack
  const targetHPBefore = target.system.health.value;

  // PHASE 1: Execute main hand attack (always attacks)
  const mainHandResult = await executeHandAttack(mainHandWeapon, attacker, target, mainHand.id);
  const mainHandResults = [mainHandResult];

  // PHASE 2: Execute offhand attacks (sequential for narrative order)
  const offHands = attacker.getOffHands();
  const offHandResults = [];

  for (const offHand of offHands) {
    // Get equipped weapon or natural weapon (F005)
    const offHandWeapon = offHand.equipment ?
      attacker.items.get(offHand.equipment) :
      attacker.getNaturalWeapon(offHand.id);

    // Skip if no weapon available (equipped or natural)
    if (!offHandWeapon) continue;

    const offhandChance = offHand.offhandChance || 0;

    const offHandResult = await executeOffhandAttack(
      offHandWeapon,
      attacker,
      target,
      offHand.id,
      offhandChance
    );

    offHandResults.push(offHandResult);
  }

  // PHASE 3: Sum all damage from all successful attacks
  const allSuccessfulAttacks = [
    ...mainHandResults.filter(r => r.hit && r.totalDamage),
    ...offHandResults.filter(r => r.triggered && r.hit && r.totalDamage)
  ];

  const totalDamage = allSuccessfulAttacks.reduce((sum, r) => sum + r.totalDamage, 0);

  // PHASE 4: Apply damage to target
  if (totalDamage > 0) {
    await target.applyDamage(totalDamage);
  }

  // Store HP after attack
  const targetHPAfter = target.system.health.value;

  // Return complete results
  return {
    attackerId: attacker.id,
    attackerName: attacker.name,
    targetId: target.id,
    targetName: target.name,
    mainHandResults: mainHandResults,
    offHandResults: offHandResults,
    totalDamage: totalDamage,
    targetHPBefore: targetHPBefore,
    targetHPAfter: targetHPAfter,
    timestamp: Date.now()
  };
}

/**
 * Format combat results for chat message template
 *
 * @param {Object} attackResults - Complete attack results
 * @returns {Object} Formatted data for template rendering
 */
export function formatCombatResults(attackResults) {
  const {
    attackerName,
    targetName,
    mainHandResults = [],
    offHandResults = [],
    totalDamage,
    targetHPBefore,
    targetHPAfter
  } = attackResults;

  // Format main hand attacks for display
  const formattedMainHands = mainHandResults.map(handResult => {
    const formatted = {
      name: `${handResult.bodyPartName} - ${handResult.weaponName}`,
      toHit: `${handResult.toHitTotal} vs DV ${handResult.targetDV}`,
      hit: handResult.hit
    };

    if (handResult.hit) {
      formatted.penetrations = handResult.penetration?.totalPenetrations || 0;
      formatted.weaponPV = handResult.weaponPV || 0;  // Show weapon PV for verification

      if (formatted.penetrations > 0) {
        // Format damage display
        const damageDetails = handResult.damageRolls.map(roll => roll.total).join(' + ');
        formatted.damage = `${handResult.weaponDamage}: ${damageDetails} = ${handResult.totalDamage}`;
      } else {
        formatted.damage = "No penetration";
      }

      // Add triplet details with singlet breakdown (US4)
      if (handResult.penetration && handResult.penetration.triplets) {
        formatted.tripletDetails = handResult.penetration.triplets.map((triplet, idx) => {
          return {
            tripletNumber: idx + 1,
            pv: triplet.attackerPV,
            av: triplet.defenderAV,
            targetNumber: triplet.targetNumber,
            passed: triplet.penetrations > 0,
            singlets: triplet.singlets.map(singlet => {
              // Format explosion chain for display
              const explosionDisplay = singlet.exploded ?
                singlet.explosionChain.join(' + ') + ` = ${singlet.total + (singlet.rolls.length * 2)}` :
                `${singlet.total + 2}`;

              return {
                rolls: explosionDisplay,
                finalTotal: singlet.total,
                succeeded: singlet.total >= triplet.targetNumber,
                exploded: singlet.exploded
              };
            })
          };
        });
      } else {
        formatted.tripletDetails = [];
      }
    }

    return formatted;
  });

  // Format offhand attacks (will be populated in US2)
  const formattedOffhands = offHandResults.map(handResult => {
    const formatted = {
      name: `${handResult.bodyPartName} - ${handResult.weaponName}`,
      percentCheck: handResult.triggered ?
        `${handResult.percentResult}% ≤ ${handResult.offhandChance}%: SUCCESS` :
        `${handResult.percentResult}% > ${handResult.offhandChance}%: FAILED`,
      triggered: handResult.triggered
    };

    // If offhand triggered, show attack details (hit or miss)
    if (handResult.triggered) {
      formatted.hit = handResult.hit;
      formatted.toHit = `${handResult.toHitTotal} vs DV ${handResult.targetDV}`;
      formatted.weaponPV = handResult.weaponPV || 0;  // Show weapon PV
      formatted.penetrations = handResult.penetration?.totalPenetrations || 0;

      if (handResult.hit && formatted.penetrations > 0) {
        const damageDetails = handResult.damageRolls.map(roll => roll.total).join(' + ');
        formatted.damage = `${handResult.weaponDamage}: ${damageDetails} = ${handResult.totalDamage}`;
      }
    }

    return formatted;
  });

  return {
    attackerName,
    targetName,
    mainHands: formattedMainHands,
    offhands: formattedOffhands,
    totalDamage,
    hpChange: `${targetHPBefore} → ${targetHPAfter} (-${totalDamage})`
  };
}

/**
 * Create combat chat message from attack results
 *
 * @async
 * @param {Object} attackResults - Complete attack results
 * @param {Actor} attacker - Attacking actor
 * @returns {Promise<ChatMessage>} Created chat message document
 */
export async function createCombatChatMessage(attackResults, attacker) {
  const templateData = formatCombatResults(attackResults);

  const html = await renderTemplate(
    "systems/cavesofqud/templates/chat/combat-attack.hbs",
    templateData
  );

  return await ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: attacker }),
    content: html,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER
  });
}
