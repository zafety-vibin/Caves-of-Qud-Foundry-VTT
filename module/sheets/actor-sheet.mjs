/**
 * Caves of Qud Actor Sheet
 * Extends Foundry's ActorSheet for character display
 */

import { CAVESOFQUD } from '../helpers/config.mjs';
import {
  buildBodyPartTree,
  flattenBodyPartTree,
  getBodyPartDisplayName,
  canEquipItem,
  canWieldWeapon
} from '../helpers/bodyparts.mjs';
import {
  getActorInspectionData,
  getActiveMutationEffects
} from '../tools/inspector.mjs';

export default class CavesOfQudActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['cavesofqud', 'sheet', 'actor'],
      width: 720,
      height: 800,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'stats' }],
      dragDrop: [{ dragSelector: '.item', dropSelector: null }]  // Allow drops anywhere on sheet
    });
  }

  /** @override */
  get template() {
    return `systems/cavesofqud/templates/actor/${this.actor.type}-sheet.hbs`;
  }

  /** @override */
  async getData() {
    const context = super.getData();

    // Use a safe clone of the actor data
    const actorData = this.document.toObject(false);

    // Add system data
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare body parts for display
    this._prepareBodyParts(context);

    // Add config
    context.config = CAVESOFQUD;

    // Add GM flag for developer tools (F006)
    context.isGM = game.user.isGM;

    // Populate developer tools data for GMs (F006)
    if (game.user.isGM) {
      // Data inspector - flatten to avoid mergeObject issues
      const inspectionData = getActorInspectionData(this.actor);
      context.inspectorRawData = inspectionData.rawData;
      context.inspectorCalculations = inspectionData.calculations;
      context.inspectorMutations = getActiveMutationEffects(this.actor);
    }

    return context;
  }

  /**
   * Prepare body parts data for display
   */
  _prepareBodyParts(context) {
    const bodyParts = context.system.bodyParts;
    if (!bodyParts || Object.keys(bodyParts).length === 0) {
      context.bodyPartsFlat = [];
      return;
    }

    // Build hierarchical tree
    const tree = buildBodyPartTree(bodyParts, context.system.bodyRoot);

    // Flatten for template iteration
    const flat = flattenBodyPartTree(tree);

    // Prepare available equipment for dropdowns
    const armorItems = [];
    const weaponItems = [];

    for (let item of this.actor.items) {
      if (item.type === 'armor') {
        armorItems.push(item);
      } else if (item.type === 'weapon') {
        weaponItems.push(item);
      }
    }

    context.armorItems = armorItems;
    context.weaponItems = weaponItems;

    // Add display data to each part
    for (let item of flat) {
      item.displayName = getBodyPartDisplayName(item.part);
      item.canEquip = canEquipItem(item.part);
      item.canWield = canWieldWeapon(item.part);

      // Get equipped item if any
      if (item.part.equipment) {
        item.equippedItem = this.actor.items.get(item.part.equipment);
      }

      // Get natural weapon if any (F005)
      item.naturalWeapon = this.actor.getNaturalWeapon(item.part.id);

      // Check if equipment is blocked by mutations (F005)
      item.armorBlocked = this.actor.isEquipmentBlocked(item.part, 'armor');
      item.weaponBlocked = this.actor.isEquipmentBlocked(item.part, 'weapon');

      // Burrowing Claw body part type displays correctly (F005)
      // No special renaming needed - BurrowingClaw type already has correct name from config

      // Quills special case: rename Back → Quills (F005)
      if (item.part.naturalArmor?.source === 'Quills' && item.part.type === 'Back') {
        item.displayName = 'Quills';
      }

      // Wings special case: rename Back slot (F005)
      if (item.part.hasWings && item.part.type === 'Back') {
        // Keep the variant but add "Around Wings" context
        item.displayName = item.displayName + ' (Around Wings)';
      }

      // Check if this part has any weapon (equipped or natural)
      item.hasWeapon = !!(item.equippedItem?.type === 'weapon' || item.naturalWeapon);

      // Check if this is the designated main hand
      item.isMainHand = (item.part.id === context.system.combat.mainHandId);

      // Add indent for tree display (20px per depth level)
      item.indent = item.depth * 20;
    }

    context.bodyPartsFlat = flat;

    // Prepare equipment breakdown for combat stats
    this._prepareEquipmentBreakdown(context);
  }

  /**
   * Prepare equipment breakdown for stat tooltips
   */
  _prepareEquipmentBreakdown(context) {
    const bodyParts = context.system.bodyParts;
    if (!bodyParts) return;

    const breakdown = {
      av: [],
      dv: []
    };

    // Group by type and collect equipment
    const partsByType = {};
    for (let part of Object.values(bodyParts)) {
      if (!partsByType[part.type]) partsByType[part.type] = [];
      partsByType[part.type].push(part);
    }

    // Build breakdown
    for (let [type, parts] of Object.entries(partsByType)) {
      const avValues = [];
      const dvValues = [];

      for (let part of parts) {
        if (part.equipment) {
          const item = this.actor.items.get(part.equipment);
          if (item && item.type === 'armor') {
            if (item.system.av > 0) {
              avValues.push(`${item.name} (${item.system.av})`);
            }
            if (item.system.dvModifier !== 0) {
              dvValues.push(`${item.name} (${item.system.dvModifier >= 0 ? '+' : ''}${item.system.dvModifier})`);
            }
          }
        }
      }

      if (avValues.length > 0) {
        const avg = parts.reduce((sum, p) => {
          const item = this.actor.items.get(p.equipment);
          return sum + (item?.system?.av || 0);
        }, 0) / parts.length;

        breakdown.av.push(`${type}: ${avValues.join(', ')} → ${Math.floor(avg)}`);
      }

      if (dvValues.length > 0) {
        const avg = parts.reduce((sum, p) => {
          const item = this.actor.items.get(p.equipment);
          return sum + (item?.system?.dvModifier || 0);
        }, 0) / parts.length;

        breakdown.dv.push(`${type}: ${dvValues.join(', ')} → ${Math.floor(avg)}`);
      }
    }

    context.equipmentBreakdown = breakdown;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Equipment selection
    html.find('.equipment-select').change(this._onEquipmentSelect.bind(this));

    // Unequip item
    html.find('.item-unequip').click(this._onItemUnequip.bind(this));

    // Item management
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));

    // Combat actions
    html.find('.attack-button').click(this._onAttackClick.bind(this));
    html.find('.set-main-hand').click(this._onSetMainHand.bind(this));
  }

  /**
   * Handle equipment selection from dropdown
   */
  async _onEquipmentSelect(event) {
    event.preventDefault();
    const select = event.currentTarget;
    const partId = select.dataset.partId;
    const itemId = select.value;

    if (!itemId) return;

    await this.actor.equipToBodyPart(itemId, partId);
  }

  /**
   * Handle unequipping an item
   */
  async _onItemUnequip(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const partId = button.dataset.partId;

    await this.actor.unequipFromBodyPart(partId);
  }

  /**
   * Handle item drops onto sheet
   */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);

    // Check if dropping onto a body part row (for equipment)
    const dropTarget = event.target.closest('.body-part-row');

    if (dropTarget && data.type === 'Item') {
      // Dropping onto body part - try to equip
      const partId = dropTarget.dataset.partId;
      if (!partId) return super._onDrop(event);

      const item = await Item.implementation.fromDropData(data);
      if (!item) return super._onDrop(event);

      // If item not owned by this actor, add it first
      if (item.actor?.id !== this.actor.id) {
        const itemData = item.toObject();
        const [createdItem] = await this.actor.createEmbeddedDocuments('Item', [itemData]);
        await this.actor.equipToBodyPart(createdItem.id, partId);
      } else {
        // Already owned, just equip
        await this.actor.equipToBodyPart(item.id, partId);
      }
    } else {
      // Not on body part, use default Foundry behavior (add to inventory)
      return super._onDrop(event);
    }
  }

  /**
   * Handle creating a new item
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;

    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type,
      system: {}
    };

    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle editing an item
   */
  _onItemEdit(event) {
    event.preventDefault();
    const li = event.currentTarget.closest('.item-row');
    const item = this.actor.items.get(li.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  /**
   * Handle deleting an item
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const li = event.currentTarget.closest('.item-row');
    const item = this.actor.items.get(li.dataset.itemId);
    if (item) await item.delete();
  }

  /**
   * Override render to populate equipment dropdowns after render
   */
  async _render(force, options) {
    await super._render(force, options);

    // Populate equipment dropdowns
    const html = this.element;
    html.find('.equipment-select').each((i, select) => {
      const partId = select.dataset.partId;
      const canWield = select.dataset.canWield === 'true';
      const part = this.actor.getBodyPart(partId);

      if (!part) return;

      const partType = CAVESOFQUD.bodyPartTypes[part.type];

      // Add armor options
      for (let item of this.actor.items) {
        if (item.type === 'armor' && item.system.slot === partType.slotType) {
          const option = new Option(item.name, item.id);
          select.add(option);
        }
      }

      // Add weapon options if part can wield
      if (canWield) {
        for (let item of this.actor.items) {
          if (item.type === 'weapon') {
            const option = new Option(`${item.name} (${item.system.damage})`, item.id);
            select.add(option);
          }
        }
      }
    });
  }

  /**
   * Handle attack button click
   */
  async _onAttackClick(event) {
    event.preventDefault();

    // Get target from user selection
    const targets = Array.from(game.user.targets);
    if (targets.length === 0) {
      ui.notifications.warn("You must target an enemy before attacking");
      return;
    }

    const target = targets[0].actor;
    if (!target) {
      ui.notifications.error("Invalid target");
      return;
    }

    try {
      // Execute attack
      await this.actor.rollMultiAttack(target);
    } catch (error) {
      ui.notifications.error(error.message);
      console.error("Attack failed:", error);
    }
  }

  /**
   * Handle main hand designation button click
   */
  async _onSetMainHand(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const partId = button.dataset.partId;

    try {
      await this.actor.setMainHand(partId);
      ui.notifications.info("Main hand designated");
    } catch (error) {
      ui.notifications.error(error.message);
      console.error("Set main hand failed:", error);
    }
  }
}
