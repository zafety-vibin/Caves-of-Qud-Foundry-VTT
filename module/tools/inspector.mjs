/**
 * Actor Data Inspector
 * Provides data inspection and calculation breakdown tools for GMs
 */

/**
 * Get formatted actor data for inspection
 *
 * @param {Actor} actor - Actor document
 * @returns {Object} Inspection data with raw JSON and calculated values
 */
export function getActorInspectionData(actor) {
  // Format raw system data as pretty JSON
  const rawData = JSON.stringify(actor.system, null, 2);

  // Extract key calculated values
  const calculations = [
    {
      category: "Attributes",
      stats: Object.entries(actor.system.attributes).map(([key, attr]) => ({
        label: key.toUpperCase(),
        value: attr.value,
        modifier: attr.mod,
        formula: `(${attr.value} - 16) / 2 = ${attr.mod}`
      }))
    },
    {
      category: "Combat Stats",
      stats: [
        { label: "HP Max", value: actor.system.health.max, formula: "From HP history + TOU mod" },
        { label: "DV", value: actor.system.combat.dv, formula: `6 (base) + ${actor.system.attributes.agility.mod} (AGI) + equipment` },
        { label: "PV", value: actor.system.combat.pv, formula: `4 (base) + ${actor.system.attributes.strength.mod} (STR)` },
        { label: "MA", value: actor.system.combat.ma, formula: `4 (base) + ${actor.system.attributes.willpower.mod} (WIL)` },
        { label: "AV", value: actor.system.combat.av, formula: "From equipment + natural armor (averaged by type)" }
      ]
    },
    {
      category: "Derived Stats",
      stats: [
        { label: "Carry Capacity", value: actor.system.carryCapacity.max, formula: `${actor.system.attributes.strength.value} × 15 = ${actor.system.carryCapacity.max}` },
        { label: "Skill Points", value: actor.system.skillPoints.available, formula: `${actor.system.skillPoints.total} total - ${actor.system.skillPoints.spent} spent` }
      ]
    }
  ];

  return {
    rawData: rawData,
    calculations: calculations
  };
}

/**
 * Get calculation breakdown for a specific stat
 *
 * @param {Actor} actor - Actor document
 * @param {string} statName - "hp", "dv", "pv", "av", "carryCapacity", etc.
 * @returns {Object} Step-by-step calculation with formula
 */
export function getCalculationBreakdown(actor, statName) {
  // Simplified for MVP - return basic formula
  const breakdowns = {
    "hp": {
      statName: "HP Max",
      currentValue: actor.system.health.max,
      formula: "Level 1: TOU value, then +1d4+TOU mod per level",
      steps: actor.system.health.hpHistory || []
    },
    "dv": {
      statName: "DV",
      currentValue: actor.system.combat.dv,
      formula: `6 + ${actor.system.attributes.agility.mod} (AGI) + equipment DV`,
      steps: []
    },
    "av": {
      statName: "AV",
      currentValue: actor.system.combat.av,
      formula: "Equipment AV + Natural Armor, averaged by body part type",
      steps: []
    }
  };

  return breakdowns[statName] || { statName: "Unknown", currentValue: 0, formula: "N/A", steps: [] };
}

/**
 * Get all active effects from mutations
 *
 * @param {Actor} actor - Actor document
 * @returns {Array} List of mutation effects with sources
 */
export function getActiveMutationEffects(actor) {
  const effects = [];

  for (let item of actor.items) {
    if (item.type === 'mutation' && item.system.isActive) {
      effects.push({
        name: item.name,
        level: item.system.level,
        mpCost: item.system.mpCost,
        effect: item.system.effect,
        bodyPartsAdded: item.system.addedBodyParts?.length || 0,
        hasNaturalWeapon: item.system.naturalWeapon?.enabled || false,
        providesArmor: item.system.providesArmor?.enabled || false,
        blocksEquipment: Object.keys(item.system.blockedEquipment || {}).length > 0
      });
    }
  }

  return effects;
}
