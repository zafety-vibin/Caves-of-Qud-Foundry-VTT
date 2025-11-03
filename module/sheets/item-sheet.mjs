/**
 * Caves of Qud Item Sheet
 * Extends Foundry's ItemSheet for item display
 */

import { CAVESOFQUD } from '../helpers/config.mjs';

export default class CavesOfQudItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['cavesofqud', 'sheet', 'item'],
      width: 520,
      height: 480,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'description' }]
    });
  }

  /** @override */
  get template() {
    const path = 'systems/cavesofqud/templates/item';
    return `${path}/${this.item.type}-sheet.hbs`;
  }

  /** @override */
  async getData() {
    const context = super.getData();

    const itemData = this.document.toObject(false);

    context.system = itemData.system;
    context.flags = itemData.flags;
    context.config = CAVESOFQUD;

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // Mutation apply/remove
    html.find('.mutation-apply-btn').click(this._onApplyMutation.bind(this));
    html.find('.mutation-remove-btn').click(this._onRemoveMutation.bind(this));
  }

  /**
   * Handle applying a mutation
   */
  async _onApplyMutation(event) {
    event.preventDefault();

    const mutation = this.item;
    const actor = mutation.actor;

    if (!actor) {
      ui.notifications.warn('Mutation must be owned by a character to apply');
      return;
    }

    await actor.applyMutation(mutation);
  }

  /**
   * Handle removing a mutation
   */
  async _onRemoveMutation(event) {
    event.preventDefault();

    const mutation = this.item;
    const actor = mutation.actor;

    if (!actor) {
      ui.notifications.warn('Mutation must be owned by a character to remove');
      return;
    }

    await actor.removeMutation(mutation);
  }
}
