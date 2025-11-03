/**
 * Caves of Qud Actor Document
 * Extends Foundry's Actor class with Qud-specific stat calculations
 *
 * All formulas sourced from: https://wiki.cavesofqud.com/
 */

import { CAVESOFQUD } from '../helpers/config.mjs';
import {
  createHumanoidBody,
  addBodyPart,
  removeBodyPart,
  getBodyPartsByType,
  getEquippableBodyParts,
  getWieldingBodyParts,
  canEquipItem,
  canWieldWeapon,
  addBodyPartWithChildren,
  rollChimeraBodyPart,
  selectRandomParent,
  getBodyPartDisplayName
} from '../helpers/bodyparts.mjs';
import {
  validateAttacker,
  validateMainHandId,
  executeHandAttack,
  executeMultiWeaponAttack,
  createCombatChatMessage
} from '../helpers/combat.mjs';

export default class CavesOfQudActor extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data
   */
  prepareData() {
    super.prepareData();

    // Initialize body parts in memory if empty
    // Actual persistence happens in _preCreate hook
    if (!this.system.bodyParts || Object.keys(this.system.bodyParts).length === 0) {
      const humanoidBody = createHumanoidBody();
      this.system.bodyParts = humanoidBody.parts;
      this.system.bodyRoot = humanoidBody.root;
    }
  }

  /**
   * Pre-creation hook - initialize body parts before saving
   */
  async _preCreate(data, options, userId) {
    await super._preCreate(data, options, userId);

    // Initialize body parts for new actors
    if (!data.system?.bodyParts || Object.keys(data.system?.bodyParts || {}).length === 0) {
      const humanoidBody = createHumanoidBody();

      this.updateSource({
        'system.bodyParts': humanoidBody.parts,
        'system.bodyRoot': humanoidBody.root
      });
    }
  }

  /**
   * Prepare derived data for the actor
   * This is called automatically whenever actor data changes
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;

    // Calculate based on actor type
    if (actorData.type === 'character') this._prepareCharacterData(actorData);
    if (actorData.type === 'npc') this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    const systemData = actorData.system;

    // Calculate attribute modifiers (Foundation for all other calculations)
    this._calculateAttributeModifiers(systemData);

    // Calculate natural armor FIRST (F005) - must run before combat stats so AV is included
    this._calculateNaturalArmor(systemData);

    // Calculate all derived stats (includes natural armor in AV now)
    this._calculateCombatStats(systemData);
    this._calculateCarryCapacity(systemData);
    this._calculateSkillPoints(systemData);
    this._calculateHPRegeneration(systemData);
    this._calculateCooldownReduction(systemData);

    // Apply mutation stat bonuses (F006 - systems-based approach)
    this._applyMutationBonuses(systemData);

    // Calculate offhand attack chances (US2)
    this._calculateOffhandChances(systemData);
  }

  /**
   * Prepare NPC type specific data
   * NPCs calculate stats normally, then apply manual modifiers for GM flexibility
   */
  _prepareNpcData(actorData) {
    const systemData = actorData.system;

    // Calculate base stats from attributes (same as characters)
    this._calculateAttributeModifiers(systemData);

    // Calculate natural armor FIRST (F005) - must run before combat stats
    this._calculateNaturalArmor(systemData);

    // Calculate combat stats (includes natural armor now)
    this._calculateCombatStats(systemData);
    this._calculateCarryCapacity(systemData);
    this._calculateSkillPoints(systemData);
    this._calculateHPRegeneration(systemData);
    this._calculateCooldownReduction(systemData);

    // Apply mutation stat bonuses (F006 - systems-based approach)
    this._applyMutationBonuses(systemData);

    // Calculate offhand attack chances (US2)
    this._calculateOffhandChances(systemData);

    // Apply NPC stat modifiers (GM adjustments)
    if (systemData.statModifiers) {
      // Store calculated values before modifiers
      systemData.combat.dvBase = systemData.combat.dv;
      systemData.combat.pvBase = systemData.combat.pv;
      systemData.combat.maBase = systemData.combat.ma;
      systemData.combat.avBase = systemData.combat.av;
      systemData.health.maxBase = systemData.health.max;

      // Apply modifiers to final values
      systemData.combat.dv += systemData.statModifiers.dv || 0;
      systemData.combat.pv += systemData.statModifiers.pv || 0;
      systemData.combat.ma += systemData.statModifiers.ma || 0;
      systemData.combat.av += systemData.statModifiers.av || 0;
      systemData.health.max += systemData.statModifiers.hp || 0;

      // Ensure current HP doesn't exceed modified max
      if (systemData.health.value > systemData.health.max) {
        systemData.health.value = systemData.health.max;
      }
    }
  }

  /**
   * Calculate attribute modifiers
   * Formula: (value - 16) / 2, rounded down
   * Source: https://wiki.cavesofqud.com/wiki/Attributes
   */
  _calculateAttributeModifiers(systemData) {
    for (let [key, attribute] of Object.entries(systemData.attributes)) {
      attribute.mod = Math.floor((attribute.value - 16) / 2);
    }
  }

  /**
   * Calculate combat statistics
   * - DV (Dodge Value) = 6 + AGI modifier
   * - PV (Penetration Value) = 4 + STR modifier
   * - MA (Mental Armor) = 4 + WIL modifier
   * - AV (Armor Value) = from equipment (calculated separately)
   *
   * Sources:
   * - https://wiki.cavesofqud.com/wiki/Agility (DV formula)
   * - https://wiki.cavesofqud.com/wiki/Strength (PV formula)
   * - https://wiki.cavesofqud.com/wiki/Mental_Armor (MA formula)
   */
  _calculateCombatStats(systemData) {
    const agiMod = systemData.attributes.agility.mod;
    const strMod = systemData.attributes.strength.mod;
    const wilMod = systemData.attributes.willpower.mod;

    // DV = 6 + AGI modifier (equipment bonuses added separately)
    systemData.combat.dv = CAVESOFQUD.baseValues.dvBase + agiMod;

    // PV = 4 + STR modifier
    systemData.combat.pv = CAVESOFQUD.baseValues.pvBase + strMod;

    // MA = 4 + WIL modifier
    systemData.combat.ma = CAVESOFQUD.baseValues.maBase + wilMod;

    // Calculate HP
    this._calculateHP(systemData);

    // Apply equipment bonuses with averaging for duplicate body parts
    this._applyEquipmentBonuses(systemData);
  }

  /**
   * Apply equipment bonuses with AV/DV averaging for duplicate body parts
   *
   * Qud's Core Mechanic: When you have multiple body parts of the same type
   * (e.g., two heads, four arms), armor values are AVERAGED, not summed.
   *
   * Algorithm:
   * 1. Group body parts by type (all Heads, all Arms, etc.)
   * 2. For each group, collect AV/DV from equipped items
   * 3. Average within each group
   * 4. Sum across all groups for total
   *
   * Example:
   * - 2 Heads: AV 4, AV 0 → avg 2
   * - 1 Body: AV 3 → avg 3
   * - Total AV = 2 + 3 = 5
   *
   * Source: https://wiki.cavesofqud.com/wiki/Equipment
   */
  _applyEquipmentBonuses(systemData) {
    // Group body parts by type for averaging
    const partsByType = {};

    for (let part of Object.values(systemData.bodyParts)) {
      if (!partsByType[part.type]) {
        partsByType[part.type] = [];
      }
      partsByType[part.type].push(part);
    }

    let totalAV = 0;
    let totalDV = 0;

    // Calculate AV/DV with averaging for duplicate body part types
    for (let [type, parts] of Object.entries(partsByType)) {
      if (parts.length === 0) continue;

      // Collect AV/DV values from equipment on these parts
      const avValues = [];
      const dvValues = [];

      for (let part of parts) {
        let partAV = 0;
        let partDV = 0;

        // Check equipped armor
        if (part.equipment) {
          const item = this.items.get(part.equipment);
          if (item && item.type === 'armor') {
            partAV = item.system.av || 0;
            partDV = item.system.dvModifier || 0;
          }
        }

        // Add natural armor (F005) - horns, quills, etc.
        if (part.naturalArmor && part.naturalArmor.av) {
          partAV += part.naturalArmor.av;
        }

        avValues.push(partAV);
        dvValues.push(partDV);
      }

      // Calculate average for this group
      // If only one part of this type, average = that value (no change)
      // If multiple parts, AVERAGE the values (Qud's core balance mechanic)
      if (avValues.length > 0) {
        const avgAV = avValues.reduce((sum, v) => sum + v, 0) / avValues.length;
        const avgDV = dvValues.reduce((sum, v) => sum + v, 0) / dvValues.length;
        totalAV += avgAV;
        totalDV += avgDV;
      }
    }

    // Apply equipment bonuses (round down per Qud)
    systemData.combat.av = Math.floor(totalAV);
    systemData.combat.dv += Math.floor(totalDV);
  }

  /**
   * Calculate HP (Health Points)
   * - Level 1: HP = Toughness attribute value
   * - Level 2+: HP += 1d4 + Toughness modifier
   * - Retroactive: When TOU changes, recalculate from history
   *
   * Source: https://wiki.cavesofqud.com/wiki/HP
   */
  _calculateHP(systemData) {
    const level = systemData.level.value;
    const toughValue = systemData.attributes.toughness.value;
    const toughMod = systemData.attributes.toughness.mod;

    // Initialize HP history if empty
    if (!systemData.health.hpHistory) {
      systemData.health.hpHistory = [];
    }

    // Level 1: HP equals Toughness value
    if (level === 1) {
      systemData.health.max = toughValue;

      // Initialize history if needed
      if (systemData.health.hpHistory.length === 0) {
        systemData.health.hpHistory.push({
          level: 1,
          roll: toughValue,
          modifier: toughMod,
          total: toughValue
        });
      }
    } else {
      // Levels 2+: Calculate from history
      // If history is incomplete, we need to fill it (this happens on retroactive TOU change)
      let calculatedMax = toughValue; // Start with level 1 HP

      for (let i = 1; i < systemData.health.hpHistory.length; i++) {
        const entry = systemData.health.hpHistory[i];
        // Recalculate using stored roll + current TOU modifier
        const hpGain = entry.roll + toughMod;
        entry.modifier = toughMod;
        entry.total = hpGain;
        calculatedMax += hpGain;
      }

      systemData.health.max = calculatedMax;
    }

    // Ensure current HP doesn't exceed max (can happen after retroactive reduction)
    if (systemData.health.value > systemData.health.max) {
      systemData.health.value = systemData.health.max;
    }
  }

  /**
   * Calculate carry capacity
   * Formula: 15 × Strength attribute value
   * Source: https://wiki.cavesofqud.com/wiki/Strength
   */
  _calculateCarryCapacity(systemData) {
    const strValue = systemData.attributes.strength.value;
    systemData.carryCapacity.max = CAVESOFQUD.baseValues.carryCapacityMultiplier * strValue;

    // Calculate current weight from all items
    let currentWeight = 0;
    for (let item of this.items) {
      currentWeight += (item.system.weight || 0) * (item.system.quantity || 1);
    }
    systemData.carryCapacity.current = currentWeight;

    // Determine overburdened status
    systemData.carryCapacity.overburdened = currentWeight > systemData.carryCapacity.max;
  }

  /**
   * Calculate skill points
   * - True Kin: 70 base per level
   * - Mutant: 50 base per level
   * - Modifier: +4 per INT above 10, -4 per INT below 10
   * - Retroactive when INT changes
   *
   * Source: https://wiki.cavesofqud.com/wiki/Intelligence
   */
  _calculateSkillPoints(systemData) {
    const level = systemData.level.value;
    const intValue = systemData.attributes.intelligence.value;
    const characterType = systemData.characterType;

    // Base skill points per level
    const basePerLevel = (characterType === 'TrueKin')
      ? CAVESOFQUD.baseValues.skillPointsTrueKin
      : CAVESOFQUD.baseValues.skillPointsMutant;

    // Intelligence modifier to skill points: +/- 4 per point from 10
    const intModifier = (intValue - 10) * CAVESOFQUD.baseValues.skillPointsPerInt;

    // Total skill points per level
    const pointsPerLevel = basePerLevel + intModifier;

    // Calculate total across all levels
    const totalEarned = pointsPerLevel * level;

    // Update totals (preserve spent amount)
    const previousTotal = systemData.skillPoints.total || 0;
    const spent = systemData.skillPoints.spent || 0;

    systemData.skillPoints.total = totalEarned;
    systemData.skillPoints.available = totalEarned - spent;
  }

  /**
   * Calculate HP regeneration rate
   * Formula: (20 + 2×(WIL mod + TOU mod)) / 100 HP per turn
   * Interrupted for 5 turns after taking damage
   *
   * Source: https://wiki.cavesofqud.com/wiki/HP
   */
  _calculateHPRegeneration(systemData) {
    const wilMod = systemData.attributes.willpower.mod;
    const touMod = systemData.attributes.toughness.mod;

    // HP regen rate per turn
    const numerator = CAVESOFQUD.baseValues.hpRegenBase +
                     (CAVESOFQUD.baseValues.hpRegenMultiplier * (wilMod + touMod));
    systemData.hpRegen.rate = numerator / 100;

    // Note: Actual per-turn application requires turn tracking system
    // This just calculates the rate
  }

  /**
   * Calculate cooldown reduction from Willpower
   * Formula: 5% per WIL point above 16
   * Max: 80% reduction (at WIL 32)
   * Min cooldown: 5 rounds always
   *
   * Source: https://wiki.cavesofqud.com/wiki/Willpower
   */
  _calculateCooldownReduction(systemData) {
    const wilValue = systemData.attributes.willpower.value;

    // 5% reduction per point above 16
    const reduction = Math.max(0, (wilValue - 16) * CAVESOFQUD.baseValues.cooldownReductionPercent);

    // Cap at 80% maximum
    systemData.cooldownReduction.reductionPercent = Math.min(CAVESOFQUD.baseValues.cooldownReductionMax, reduction);
    systemData.cooldownReduction.minimumCooldown = CAVESOFQUD.baseValues.cooldownMinimum;
  }

  /**
   * Apply mutation stat bonuses (systems-based approach)
   * Iterates active mutations and applies their statBonuses to derived stats
   */
  _applyMutationBonuses(systemData) {
    // Iterate all active mutations
    for (let item of this.items) {
      if (item.type !== 'mutation' || !item.system.isActive) continue;
      if (!item.system.statBonuses) continue;

      const bonuses = item.system.statBonuses;
      const level = item.system.level;

      // Apply carry capacity bonuses
      if (bonuses.carryCapacity && bonuses.carryCapacity.value !== 0) {
        const bonus = bonuses.carryCapacity;

        if (bonus.type === 'flat') {
          systemData.carryCapacity.max += bonus.value;
        } else if (bonus.type === 'percent') {
          systemData.carryCapacity.max += Math.floor(systemData.carryCapacity.max * (bonus.value / 100));
        } else if (bonus.type === 'formula' && bonus.formula) {
          const formulaValue = eval(bonus.formula.replace(/level/g, level));
          systemData.carryCapacity.max += formulaValue;
        }
      }

      // Apply movement speed bonuses (store for future movement system)
      if (bonuses.movementSpeed && bonuses.movementSpeed.value !== 0) {
        if (!systemData.movement) systemData.movement = { speedBonus: 0 };

        const bonus = bonuses.movementSpeed;
        if (bonus.type === 'percent') {
          systemData.movement.speedBonus += bonus.value;
        } else if (bonus.type === 'formula' && bonus.formula) {
          const formulaValue = eval(bonus.formula.replace(/level/g, level));
          systemData.movement.speedBonus += formulaValue;
        }
      }

      // Apply quickness bonuses (for future quickness system)
      if (bonuses.quickness && bonuses.quickness.value !== 0) {
        if (!systemData.quickness) systemData.quickness = { bonus: 0 };

        const bonus = bonuses.quickness;
        if (bonus.type === 'flat') {
          systemData.quickness.bonus += bonus.value;
        } else if (bonus.type === 'formula' && bonus.formula) {
          const formulaValue = eval(bonus.formula.replace(/level/g, level));
          systemData.quickness.bonus += formulaValue;
        }
      }
    }
  }

  /**
   * Calculate offhand attack chances for all parts with weapons
   * Includes wielding parts AND parts with natural weapons (F005)
   *
   * Formula for hands: 7 + (mutation level × 3) + skill bonus
   * Formula for natural weapons: Uses attackChance from mutation (20% for horns/stinger)
   */
  _calculateOffhandChances(systemData) {
    if (!systemData.bodyParts) return;

    for (let partId in systemData.bodyParts) {
      const part = systemData.bodyParts[partId];

      // Wielding parts use mutation-based calculation
      if (canWieldWeapon(part)) {
        part.offhandChance = this._calculateOffhandChance(part, partId);
      }
      // Parts with natural weapons use attackChance from mutation
      else {
        // Check if this part has a natural weapon
        for (let item of this.items) {
          if (item.type === 'mutation' && item.system.isActive && item.system.naturalWeapon?.enabled) {
            if (item.system.naturalWeapon.bodyPartTypes.includes(part.type)) {
              part.offhandChance = item.system.naturalWeapon.attackChance;
              break;
            }
          }
        }
      }
    }
  }

  /**
   * Calculate natural armor values and special flags from mutations
   * Adds AV to body parts from mutations like Horns, Quills
   * Adds special flags like hasWings for flight capability
   */
  _calculateNaturalArmor(systemData) {
    if (!systemData.bodyParts) return;

    // Clear all natural armor and flags first (cleanup for removed mutations)
    for (let partId in systemData.bodyParts) {
      const part = systemData.bodyParts[partId];
      part.naturalArmor = { av: 0, source: "" };
      part.hasWings = false;
    }

    // Check for Wings mutation to add flight indicator (F005)
    for (let item of this.items) {
      if (item.type === 'mutation' && item.system.isActive && item.name === 'Wings') {
        for (let partId in systemData.bodyParts) {
          const part = systemData.bodyParts[partId];
          if (part.type === 'Back') {
            part.hasWings = true;
          }
        }
      }
    }

    // Check all active mutations for natural armor
    for (let item of this.items) {
      if (item.type !== 'mutation' || !item.system.isActive) continue;
      if (!item.system.providesArmor || !item.system.providesArmor.enabled) continue;

      const armorData = item.system.providesArmor;
      const bodyPartType = armorData.bodyPartType;
      const level = item.system.level;

      // Calculate resource tracking (quill count for Quills mutation)
      if (item.system.resourceTracking && item.system.resourceTracking.enabled) {
        const formula = CAVESOFQUD.naturalWeaponFormulas[item.name];
        if (formula && formula.maxQuillsFormula) {
          const maxQuills = eval(formula.maxQuillsFormula.replace(/level/g, level));
          // Initialize current quills if not set
          if (!item.system.resourceTracking.current) {
            item.system.resourceTracking.current = maxQuills;
          }
        }
      }

      // Find body parts of the specified type
      for (let partId in systemData.bodyParts) {
        const part = systemData.bodyParts[partId];
        if (part.type === bodyPartType) {
          // Calculate AV based on formula
          let av = 0;
          const formula = CAVESOFQUD.naturalWeaponFormulas[item.name];
          if (formula && formula.avFormula) {
            av = eval(formula.avFormula.replace(/level/g, level));
          }

          // Store natural armor on body part
          if (!part.naturalArmor) part.naturalArmor = {};
          part.naturalArmor.av = av;
          part.naturalArmor.source = item.name;
        }
      }
    }
  }

  /**
   * Get Ego modifier for mental mutation level scaling
   * Mental mutations add/subtract levels based on Ego modifier
   *
   * Source: https://wiki.cavesofqud.com/wiki/Ego
   */
  getEgoModifier() {
    return this.system.attributes.ego.mod;
  }

  /**
   * Level up the character
   * Rolls HP gain and adds to history
   */
  async levelUp() {
    const systemData = this.system;
    const currentLevel = systemData.level.value;
    const toughMod = systemData.attributes.toughness.mod;

    // Roll 1d4 for HP gain
    const hpRoll = new Roll('1d4');
    await hpRoll.evaluate();
    const rollResult = hpRoll.total;

    // Add to HP history
    const hpGain = rollResult + toughMod;
    systemData.health.hpHistory.push({
      level: currentLevel + 1,
      roll: rollResult,
      modifier: toughMod,
      total: hpGain
    });

    // Increment level
    await this.update({
      'system.level.value': currentLevel + 1,
      'system.health.hpHistory': systemData.health.hpHistory
    });

    // prepareDerivedData will recalculate HP automatically

    return hpGain;
  }

  /**
   * Apply damage to the actor
   * Updates last damage turn for HP regeneration interrupt
   */
  async applyDamage(amount, currentTurn = 0) {
    const newHP = Math.max(0, this.system.health.value - amount);

    await this.update({
      'system.health.value': newHP,
      'system.health.lastDamageTurn': currentTurn
    });
  }

  /**
   * Equip an item to a specific body part
   * @param {string} itemId - Item ID to equip
   * @param {string} partId - Body part ID
   * @returns {boolean} Success
   */
  async equipToBodyPart(itemId, partId) {
    const item = this.items.get(itemId);
    const part = this.system.bodyParts[partId];

    if (!item || !part) {
      ui.notifications.warn('Invalid item or body part');
      return false;
    }

    // Check if body part can equip items
    if (!canEquipItem(part)) {
      ui.notifications.warn(`${part.type} body parts cannot equip items`);
      return false;
    }

    // Check slot type compatibility (basic check, detailed in US7)
    const partType = CAVESOFQUD.bodyPartTypes[part.type];
    if (item.type === 'armor' && item.system.slot !== partType.slotType) {
      ui.notifications.warn(`${item.name} cannot be equipped on ${part.type}`);
      return false;
    }

    // Check weapon can only go in hands
    if (item.type === 'weapon' && !canWieldWeapon(part)) {
      ui.notifications.warn(`Weapons can only be equipped in Hand body parts`);
      return false;
    }

    // Check if equipment is blocked by mutations (F005)
    if (this.isEquipmentBlocked(part, item.type)) {
      ui.notifications.warn(`Cannot equip ${item.type} on ${part.type} - blocked by active mutation`);
      return false;
    }

    // Unequip previous item if slot occupied
    if (part.equipment) {
      await this.unequipFromBodyPart(partId);
    }

    // Clone bodyParts, modify, then update
    const bodyParts = foundry.utils.deepClone(this.system.bodyParts);
    bodyParts[partId].equipment = itemId;

    await this.update({ 'system.bodyParts': bodyParts });

    // Mark item as equipped
    if (!item.system.equipped) {
      await item.update({ 'system.equipped': true });
    }

    return true;
  }

  /**
   * Unequip an item from a body part
   * @param {string} partId - Body part ID
   * @returns {boolean} Success
   */
  async unequipFromBodyPart(partId) {
    const part = this.system.bodyParts[partId];
    if (!part || !part.equipment) return false;

    const itemId = part.equipment;
    const item = this.items.get(itemId);

    // Clone bodyParts, modify, then update
    const bodyParts = foundry.utils.deepClone(this.system.bodyParts);
    bodyParts[partId].equipment = null;

    await this.update({ 'system.bodyParts': bodyParts });

    // Mark item as unequipped if not equipped elsewhere
    if (item) {
      // Re-check after update
      const stillEquipped = Object.values(bodyParts).some(p => p.equipment === itemId);
      if (!stillEquipped) {
        await item.update({ 'system.equipped': false });
      }
    }

    return true;
  }

  /**
   * Get body part by ID
   * @param {string} partId - Part ID
   * @returns {Object} Body part or null
   */
  getBodyPart(partId) {
    return this.system.bodyParts[partId] || null;
  }

  /**
   * Add a body part to this actor (public method for mutations)
   * @param {string} type - Body part type
   * @param {string} parentId - Parent part ID
   * @param {string} variant - Variant name (optional)
   * @param {string} laterality - Laterality (optional)
   * @param {Array} withChildren - Child types to add (optional)
   * @param {boolean} chimeraOrigin - Mark as Chimera (optional)
   * @returns {Array} IDs of added parts
   */
  async addBodyPartMutation(type, parentId, variant = null, laterality = "", withChildren = [], chimeraOrigin = false) {
    const bodyParts = foundry.utils.deepClone(this.system.bodyParts);

    const addedIds = addBodyPartWithChildren(bodyParts, type, parentId, variant, laterality, withChildren, chimeraOrigin);

    if (addedIds.length > 0) {
      await this.update({ 'system.bodyParts': bodyParts });
    }

    return addedIds;
  }

  /**
   * Remove a body part from this actor (public method for mutations/dismemberment)
   * @param {string} partId - Part ID to remove
   * @returns {Array} IDs of removed parts
   */
  async removeBodyPartMutation(partId) {
    const bodyParts = foundry.utils.deepClone(this.system.bodyParts);

    // Get equipment from all parts before removal
    const part = bodyParts[partId];
    if (part) {
      // Collect all equipment that will be unequipped
      const toUnequip = [];
      function collectEquipment(id) {
        const p = bodyParts[id];
        if (!p) return;
        if (p.equipment) toUnequip.push(p.equipment);
        for (let childId of p.children) {
          collectEquipment(childId);
        }
      }
      collectEquipment(partId);

      // Remove the parts
      const removedIds = removeBodyPart(bodyParts, partId);

      if (removedIds.length > 0) {
        await this.update({ 'system.bodyParts': bodyParts });

        // Unequip items from removed parts
        for (let itemId of toUnequip) {
          const item = this.items.get(itemId);
          if (item && item.system.equipped) {
            await item.update({ 'system.equipped': false });
          }
        }
      }

      return removedIds;
    }

    return [];
  }

  /**
   * Apply a mutation to this actor
   * @param {CavesOfQudItem} mutationItem - Mutation item with bodyModifications
   * @returns {Array} IDs of added parts
   */
  async applyMutation(mutationItem) {
    if (!mutationItem || mutationItem.type !== 'mutation') {
      ui.notifications.warn('Invalid mutation item');
      return [];
    }

    const modifications = mutationItem.system.bodyModifications || [];
    const allAddedIds = [];
    const replacedParts = []; // Track replaced parts for restoration on removal

    for (let mod of modifications) {
      // Handle 'replace' action (e.g., Hand → BurrowingClaw)
      if (mod.action === 'replace') {
        const bodyParts = foundry.utils.deepClone(this.system.bodyParts);

        // Find all parts of target type
        for (let [partId, part] of Object.entries(bodyParts)) {
          if (part.type === mod.targetType) {
            // Track original for restoration
            replacedParts.push({ id: partId, originalType: part.type });

            // Replace type
            part.type = mod.newType;

            // Preserve equipment if specified
            if (!mod.preserveEquipment) {
              part.equipment = null;
            }

            allAddedIds.push(partId); // Track as "added" for removal later
          }
        }

        await this.update({ 'system.bodyParts': bodyParts });
        continue; // Skip to next modification
      }

      // Handle 'add' action (existing logic)
      let parentId = mod.parent;
      let partType = mod.type;
      let variant = mod.variant;
      let withChildren = mod.withChildren || [];

      // Handle random selections for Chimera
      if (parentId === 'random') {
        parentId = selectRandomParent(this.system.bodyParts);
      } else if (parentId === 'Body') {
        // Find the body root
        parentId = this.system.bodyRoot;
      }

      if (partType === 'random') {
        partType = rollChimeraBodyPart();
      }

      // Handle auto variant
      if (variant === 'auto' || !variant) {
        variant = null; // Will default to first variant in createBodyPart
      }

      // Auto-add children for certain part types if not specified
      if (withChildren.length === 0 && mod.chimeraOrigin) {
        if (partType === 'Arm') withChildren = ['Hand'];
        if (partType === 'Head') withChildren = ['Face'];
      }

      // Store parent info for chat BEFORE adding
      const parentPart = this.system.bodyParts[parentId];
      const parentName = parentPart ? getBodyPartDisplayName(parentPart) : 'body';

      // Add the part(s)
      const addedIds = await this.addBodyPartMutation(
        partType,
        parentId,
        variant,
        mod.laterality || "",
        withChildren,
        mod.chimeraOrigin || false
      );

      allAddedIds.push(...addedIds);

      // Chimera chat message - after update completes
      if (mod.chimeraOrigin && addedIds.length > 0) {
        // Re-fetch to get updated data
        const addedPart = this.system.bodyParts[addedIds[0]];
        await ChatMessage.create({
          user: game.user.id,
          speaker: ChatMessage.getSpeaker({ actor: this }),
          content: `<div class="qud-mutation-message">A ${addedPart.variant.toLowerCase()} grows out of your ${parentName.toLowerCase()}!</div>`
        });
      }
    }

    // Track added parts in mutation item
    await mutationItem.update({
      'system.addedBodyParts': allAddedIds,
      'system.isActive': true
    });

    // Chat message for mutation application
    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="qud-mutation-message">${this.name} gains ${mutationItem.name}!</div>`
    });

    return allAddedIds;
  }

  /**
   * Remove a mutation from this actor
   * @param {CavesOfQudItem} mutationItem - Mutation item to remove
   * @returns {Array} IDs of removed parts
   */
  async removeMutation(mutationItem) {
    if (!mutationItem || mutationItem.type !== 'mutation') {
      ui.notifications.warn('Invalid mutation item');
      return [];
    }

    const addedParts = mutationItem.system.addedBodyParts || [];
    const allRemovedIds = [];
    const modifications = mutationItem.system.bodyModifications || [];

    // Check if this mutation has replace actions
    const hasReplaceActions = modifications.some(mod => mod.action === 'replace');

    if (hasReplaceActions) {
      // Restore replaced parts instead of deleting them
      const bodyParts = foundry.utils.deepClone(this.system.bodyParts);

      for (let mod of modifications) {
        if (mod.action === 'replace') {
          // Find all parts of the new type and restore them
          for (let [partId, part] of Object.entries(bodyParts)) {
            if (part.type === mod.newType && addedParts.includes(partId)) {
              // Restore original type
              part.type = mod.targetType;
              allRemovedIds.push(partId); // Track as "removed" (really restored)
            }
          }
        }
      }

      await this.update({ 'system.bodyParts': bodyParts });
    } else {
      // Normal removal - delete added parts
      for (let partId of addedParts) {
        const removedIds = await this.removeBodyPartMutation(partId);
        allRemovedIds.push(...removedIds);
      }
    }

    // Clear tracking in mutation item
    await mutationItem.update({
      'system.addedBodyParts': [],
      'system.isActive': false
    });

    // Chat message
    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="qud-mutation-message">${this.name} loses ${mutationItem.name}.</div>`
    });

    return allRemovedIds;
  }

  /**
   * Apply damage to this actor
   * Reduces current HP by the specified amount, minimum 0
   *
   * @async
   * @param {number} amount - Damage amount to apply
   * @returns {Promise<Actor>} Updated actor document
   *
   * @example
   * await targetActor.applyDamage(20);
   * // Reduces HP by 20, minimum 0
   */
  async applyDamage(amount) {
    const currentHP = this.system.health.value;
    const newHP = Math.max(0, currentHP - amount);

    return await this.update({ 'system.health.value': newHP });
  }

  /**
   * Get mutation level that granted a body part
   *
   * @private
   * @param {string} bodyPartId - Body part ID
   * @returns {number} Mutation level (0 if not from mutation)
   */
  _getMutationLevelForBodyPart(bodyPartId) {
    // Find mutation items that added this body part
    for (let item of this.items) {
      if (item.type === 'mutation' && item.system.isActive) {
        const addedParts = item.system.addedBodyParts || [];
        if (addedParts.includes(bodyPartId)) {
          return item.system.level || 1;
        }
      }
    }
    return 0; // Not from mutation (base body part)
  }

  /**
   * Calculate offhand attack chance for a body part
   * Uses mutation level and Multiweapon Fighting skill
   *
   * @private
   * @param {Object} bodyPart - Body part object
   * @param {string} bodyPartId - Body part ID
   * @returns {number} Percentage chance (0-100)
   */
  _calculateOffhandChance(bodyPart, bodyPartId) {
    // Get mutation level that granted this hand
    const mutationLevel = this._getMutationLevelForBodyPart(bodyPartId);
    const baseChance = 7 + (mutationLevel * 3);

    // Get skill bonus (replacement values, not cumulative)
    // Tier 1: +20%, Tier 2: +35%, Tier 3: +50%
    const skillTier = this.system.skills?.multiweaponFighting?.tier || 0;
    const skillBonus = [0, 20, 35, 50][skillTier] || 0;

    return Math.min(100, baseChance + skillBonus);
  }

  /**
   * Set main hand designation
   *
   * @async
   * @param {string} bodyPartId - Body part ID to designate
   * @returns {Promise<Actor>} Updated actor document
   * @throws {Error} If body part invalid for main hand
   *
   * @example
   * await actor.setMainHand("hand-right-1");
   */
  async setMainHand(bodyPartId) {
    validateMainHandId(this, bodyPartId);
    return await this.update({ 'system.combat.mainHandId': bodyPartId });
  }

  /**
   * Get main hand body part
   *
   * @returns {Object|null} Body part object with id, or null
   *
   * @example
   * const mainHand = actor.getMainHand();
   * // { id: "hand-right-1", type: "Hand", equipment: "weapon-id", ... }
   */
  getMainHand() {
    const mainHandId = this.system.combat.mainHandId;
    if (!mainHandId) return null;

    const part = this.system.bodyParts[mainHandId];
    return part ? { id: mainHandId, ...part } : null;
  }

  /**
   * Get offhand body parts (all parts with weapons except main hand)
   * Includes wielding parts AND parts with natural weapons (F005)
   *
   * @returns {Array<Object>} Array of offhand body part objects with ids
   *
   * @example
   * const offhands = actor.getOffHands();
   * // [{ id: "hand-left-1", offhandChance: 13, ... }, { id: "head", offhandChance: 20, ... }]
   */
  getOffHands() {
    const mainHandId = this.system.combat.mainHandId;
    const offhands = [];

    for (let [partId, part] of Object.entries(this.system.bodyParts)) {
      // Skip main hand
      if (partId === mainHandId) continue;

      // Include if it's a wielding part OR has a natural weapon
      const isWielding = canWieldWeapon(part);
      const hasNaturalWeapon = !!this.getNaturalWeapon(partId);

      if (isWielding || hasNaturalWeapon) {
        offhands.push({ id: partId, ...part });
      }
    }

    return offhands;
  }

  /**
   * Get natural weapon for a body part from active mutations
   *
   * Returns a virtual weapon object if any active mutation grants a natural
   * weapon to this body part type. Returns null if no natural weapon or if
   * a regular weapon is equipped (equipped weapons override natural weapons).
   *
   * @param {string} bodyPartId - Body part ID
   * @returns {Object|null} Virtual weapon object or null
   */
  getNaturalWeapon(bodyPartId) {
    const bodyPart = this.system.bodyParts[bodyPartId];
    if (!bodyPart) return null;

    // Equipped weapons override natural weapons
    if (bodyPart.equipment) return null;

    // Check all active mutations for natural weapons
    for (let item of this.items) {
      if (item.type !== 'mutation' || !item.system.isActive) continue;
      if (!item.system.naturalWeapon || !item.system.naturalWeapon.enabled) continue;

      const naturalWeapon = item.system.naturalWeapon;

      // Check if this body part type gets the natural weapon
      if (naturalWeapon.bodyPartTypes.includes(bodyPart.type)) {
        // Get damage based on mutation level - MUST be actual formula like "1d3-1"
        let damage = CAVESOFQUD.getNaturalWeaponDamage(item.name, item.system.level);
        if (!damage) {
          damage = naturalWeapon.damageFormula; // Fallback
        }
        // If still a reference string, try to resolve it
        if (typeof damage === 'string' && !damage.includes('d')) {
          damage = CAVESOFQUD.getNaturalWeaponDamage(damage, item.system.level) || "1d4";
        }

        // Calculate PV
        let pv = 0;
        const formula = CAVESOFQUD.naturalWeaponFormulas[item.name];
        if (formula && formula.pvFormula) {
          if (formula.pvFormula.includes("level")) {
            pv = eval(formula.pvFormula.replace(/level/g, item.system.level));
          } else {
            pv = naturalWeapon.pv || 0;
          }
        }

        return {
          id: `natural-${item.id}-${bodyPartId}`,
          name: item.name,
          type: "weapon",
          system: {
            damage: damage,
            pv: pv,
            weaponType: "melee"
          }
        };
      }
    }

    return null;
  }

  /**
   * Check if equipment is blocked on a body part by mutations
   *
   * @param {Object} bodyPart - Body part object
   * @param {string} itemType - Item type ("armor", "weapon", etc.)
   * @returns {boolean} True if blocked
   */
  isEquipmentBlocked(bodyPart, itemType) {
    if (!bodyPart) return false;

    // Check all active mutations for equipment blocking
    for (let item of this.items) {
      if (item.type !== 'mutation' || !item.system.isActive) continue;
      if (!item.system.blockedEquipment) continue;

      const blocked = item.system.blockedEquipment[bodyPart.type];
      if (blocked && blocked.includes(itemType)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Roll multi-weapon attack against target
   * Main entry point for player-initiated attacks
   *
   * @async
   * @param {Actor} target - Target actor
   * @returns {Promise<Object>} Attack results
   * @throws {Error} If validation fails
   *
   * @example
   * const result = await playerActor.rollMultiAttack(enemyActor);
   * // Executes full attack sequence and posts to chat
   */
  async rollMultiAttack(target) {
    // Validate attacker
    validateAttacker(this);

    // Validate target
    if (!target || !target.system) {
      throw new Error("Invalid target");
    }

    // Auto-designate main hand if only one part with a weapon (F005)
    const partsWithWeapons = [];
    for (let [partId, part] of Object.entries(this.system.bodyParts)) {
      const hasEquippedWeapon = part.equipment && this.items.get(part.equipment)?.type === 'weapon';
      const hasNaturalWeapon = !!this.getNaturalWeapon(partId);

      if (hasEquippedWeapon || hasNaturalWeapon) {
        partsWithWeapons.push({ id: partId, ...part });
      }
    }

    if (partsWithWeapons.length === 1 && !this.system.combat.mainHandId) {
      await this.update({ 'system.combat.mainHandId': partsWithWeapons[0].id });
    }

    // Execute multi-weapon attack sequence (US2)
    const attackResults = await executeMultiWeaponAttack(this, target);

    // Create chat message
    await createCombatChatMessage(attackResults, this);

    return attackResults;
  }
}
