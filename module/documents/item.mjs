/**
 * Caves of Qud Item Document
 * Extends Foundry's Item class
 *
 * Note: Mental Mutation Level Scaling
 * When mental mutations are implemented, they should:
 * - Get base level from item.system.level
 * - Add actor.getEgoModifier() to get effective level
 * - Formula: effectiveLevel = baseLevel + egoModifier
 * - Example: Pyrokinesis level 5, character EGO 20 (+2) = effective level 7
 * Source: https://wiki.cavesofqud.com/wiki/Ego
 */

export default class CavesOfQudItem extends Item {

  /**
   * Augment the basic item data with additional dynamic data
   */
  prepareData() {
    super.prepareData();
  }

  /**
   * Prepare derived data for the item
   */
  prepareDerivedData() {
    const itemData = this;
    const systemData = itemData.system;

    // Future: Item-specific calculations
  }
}
