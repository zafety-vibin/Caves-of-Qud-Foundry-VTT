/**
 * Caves of Qud System Configuration
 * Central configuration for attributes, constants, and system settings
 */

export const CAVESOFQUD = {};

/**
 * Attribute names and localization keys
 */
CAVESOFQUD.attributes = {
  strength: "CAVESOFQUD.AttributeStrength",
  agility: "CAVESOFQUD.AttributeAgility",
  toughness: "CAVESOFQUD.AttributeToughness",
  intelligence: "CAVESOFQUD.AttributeIntelligence",
  willpower: "CAVESOFQUD.AttributeWillpower",
  ego: "CAVESOFQUD.AttributeEgo"
};

/**
 * Attribute abbreviations
 */
CAVESOFQUD.attributeAbbreviations = {
  strength: "CAVESOFQUD.AttributeStrengthAbbr",
  agility: "CAVESOFQUD.AttributeAgilityAbbr",
  toughness: "CAVESOFQUD.AttributeToughnessAbbr",
  intelligence: "CAVESOFQUD.AttributeIntelligenceAbbr",
  willpower: "CAVESOFQUD.AttributeWillpowerAbbr",
  ego: "CAVESOFQUD.AttributeEgoAbbr"
};

/**
 * Base values for calculations
 * Source: Caves of Qud wiki
 */
CAVESOFQUD.baseValues = {
  attributeBase: 16,
  dvBase: 6,
  pvBase: 4,
  maBase: 4,
  carryCapacityMultiplier: 15,
  skillPointsTrueKin: 70,
  skillPointsMutant: 50,
  skillPointsPerInt: 4,
  hpRegenBase: 20,
  hpRegenMultiplier: 2,
  cooldownReductionPercent: 5,
  cooldownReductionMax: 80,
  cooldownMinimum: 5,
  regenInterruptTurns: 5
};

/**
 * Body Part Types
 * Based on Caves of Qud's body part system
 * Source: https://wiki.cavesofqud.com/wiki/Modding:Bodies
 */
CAVESOFQUD.bodyPartTypes = {
  Body: {
    name: "Body",
    canEquip: true,
    slotType: "body",
    canWield: false,
    variants: ["Body", "Chassis", "Torso", "Core", "Shell", "Carapace"],
    properties: {
      mortal: true,
      appendage: false,
      mobility: 0,
      usuallyOn: null
    }
  },
  Head: {
    name: "Head",
    canEquip: true,
    slotType: "head",
    canWield: false,
    variants: ["Head", "Skull", "Control Unit", "Nuclear Protrusion", "Ear", "Head Section", "Brain Case"],
    properties: {
      mortal: false,
      appendage: true,
      mobility: 0,
      usuallyOn: "Body"
    }
  },
  Face: {
    name: "Face",
    canEquip: true,
    slotType: "face",
    canWield: false,
    variants: ["Face", "Sensory Nodule", "Eye", "Antennae", "Sensor Array", "Optics"],
    properties: {
      mortal: false,
      appendage: false,
      mobility: 0,
      usuallyOn: "Head"
    }
  },
  Back: {
    name: "Back",
    canEquip: true,
    slotType: "back",
    canWield: false,
    variants: ["Back", "Case", "Membrane", "Blanket", "Carapace Back", "Shell"],
    properties: {
      mortal: false,
      appendage: false,
      mobility: 0,
      usuallyOn: "Body"
    }
  },
  Arm: {
    name: "Arm",
    canEquip: true,
    slotType: "arm",
    canWield: false,
    variants: ["Arm", "Robo-Arm", "Armbone", "Stalk", "Tentacle Arm", "Limb"],
    properties: {
      mortal: false,
      appendage: true,
      mobility: 5,
      usuallyOn: "Body"
    }
  },
  Hand: {
    name: "Hand",
    canEquip: true,
    slotType: "hand",
    canWield: true,
    variants: ["Hand", "Manipulator", "Claw", "Pincer", "Tentacle", "Paw", "Hoof"],
    properties: {
      mortal: false,
      appendage: true,
      mobility: 0,
      usuallyOn: "Arm",
      attackChance: 15
    }
  },
  BurrowingClaw: {
    name: "Burrowing Claw",
    canEquip: true,
    slotType: "hand",
    canWield: true,
    variants: ["Burrowing Claw"],
    properties: {
      mortal: false,
      appendage: true,
      mobility: 0,
      usuallyOn: "Arm",
      attackChance: 15
    }
  },
  Feet: {
    name: "Feet",
    canEquip: true,
    slotType: "feet",
    canWield: false,
    variants: ["Feet", "Footbones", "Legs", "Support Struts", "Hooves", "Pads", "Talons"],
    properties: {
      mortal: false,
      appendage: true,
      mobility: 10,
      usuallyOn: "Body"
    }
  },
  FloatingNearby: {
    name: "Floating Nearby",
    canEquip: true,
    slotType: "floating",
    canWield: false,
    variants: ["Floating Nearby"],
    properties: {
      mortal: false,
      appendage: false,
      mobility: 0,
      usuallyOn: "Body"
    }
  },
  Tail: {
    name: "Tail",
    canEquip: false,
    slotType: "tail",
    canWield: false,
    variants: ["Tail", "Tail Spine", "Stinger Tail"],
    properties: {
      mortal: false,
      appendage: true,
      mobility: 0,
      usuallyOn: "Body"
    }
  },
  Fin: {
    name: "Fin",
    canEquip: false,
    slotType: "fin",
    canWield: false,
    variants: ["Fin", "Dorsal Fin", "Tail Fin"],
    properties: {
      mortal: false,
      appendage: true,
      mobility: 0,
      usuallyOn: "Body"
    }
  },
  Roots: {
    name: "Roots",
    canEquip: true,
    slotType: "roots",
    canWield: false,
    variants: ["Roots", "Support Hyphae", "Mulch", "Stakes"],
    properties: {
      mortal: false,
      appendage: false,
      mobility: 0,
      usuallyOn: "Body"
    }
  },
  Tread: {
    name: "Tread",
    canEquip: true,
    slotType: "tread",
    canWield: false,
    variants: ["Tread", "Wheels", "Tracks"],
    properties: {
      mortal: false,
      appendage: false,
      mobility: 15,
      usuallyOn: "Body"
    }
  },
  FungalOutcrop: {
    name: "Fungal Outcrop",
    canEquip: false,
    slotType: "fungal",
    canWield: false,
    variants: ["Fungal Outcrop", "Lichen Patch", "Mushroom Cap"],
    properties: {
      mortal: false,
      appendage: false,
      mobility: 0,
      usuallyOn: null
    }
  },
  IcyOutcrop: {
    name: "Icy Outcrop",
    canEquip: false,
    slotType: "icy",
    canWield: false,
    variants: ["Icy Outcrop", "Frost Formation", "Ice Shard"],
    properties: {
      mortal: false,
      appendage: false,
      mobility: 0,
      usuallyOn: null
    }
  }
};

/**
 * Laterality options for body parts
 */
CAVESOFQUD.laterality = {
  none: "",
  left: "Left",
  right: "Right",
  front: "Front",
  hind: "Hind",
  upper: "Upper",
  lower: "Lower"
};

/**
 * Natural Weapon Damage Formulas
 * Source: Caves of Qud wiki mutation pages
 */
CAVESOFQUD.naturalWeaponFormulas = {
  "BurrowingClaws": {
    damageByLevel: [
      { minLevel: 1, maxLevel: 3, damage: "1d2-1" },
      { minLevel: 4, maxLevel: 6, damage: "1d3-1" },
      { minLevel: 7, maxLevel: 9, damage: "1d4-1" },
      { minLevel: 10, maxLevel: 12, damage: "1d6-1" },
      { minLevel: 13, maxLevel: 15, damage: "1d8-1" },
      { minLevel: 16, maxLevel: 17, damage: "1d10-1" },
      { minLevel: 18, maxLevel: 99, damage: "1d12-1" }
    ],
    pvFormula: "level * 3",
    weaponClass: "Short Blade"
  },
  "Horns": {
    damageFormula: "2d(Math.floor(level / 3) + 3)",
    avFormula: "Math.floor((level - 1) / 3) + 1",
    weaponClass: "Short Blade",
    attackChance: 20
  },
  "Stinger": {
    damageByLevel: [
      { minLevel: 1, maxLevel: 3, damage: "1d6" },
      { minLevel: 4, maxLevel: 6, damage: "1d8" },
      { minLevel: 7, maxLevel: 12, damage: "1d10" },
      { minLevel: 13, maxLevel: 18, damage: "1d12" },
      { minLevel: 19, maxLevel: 99, damage: "2d8" }
    ],
    weaponClass: "Long Blade",
    attackChance: 20
  },
  "Quills": {
    maxQuillsFormula: "300 + (level - 1) * 100",
    avFormula: "1 + Math.floor(level / 2)"
  },
  "Wings": {
    sprintSpeedFormula: "10 + (level - 1) * 10"
  }
};

/**
 * Get natural weapon damage for a mutation type and level
 * @param {string} mutationType - Mutation type (e.g., "BurrowingClaws")
 * @param {number} level - Mutation level
 * @returns {string} Damage formula (e.g., "1d4-1")
 */
CAVESOFQUD.getNaturalWeaponDamage = function(mutationType, level) {
  const formula = CAVESOFQUD.naturalWeaponFormulas[mutationType];
  if (!formula) return null;

  // Check if it has level-based damage table
  if (formula.damageByLevel) {
    const tier = formula.damageByLevel.find(t => level >= t.minLevel && level <= t.maxLevel);
    return tier ? tier.damage : formula.damageByLevel[formula.damageByLevel.length - 1].damage;
  }

  // Check if it has damage formula
  if (formula.damageFormula) {
    // Evaluate formula (for Horns: 2d(floor(level/3)+3))
    const diceCount = 2;
    const diceSize = Math.floor(level / 3) + 3;
    return `${diceCount}d${diceSize}`;
  }

  return null;
};
