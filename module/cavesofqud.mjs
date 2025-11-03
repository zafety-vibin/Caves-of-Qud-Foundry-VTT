/**
 * Caves of Qud System
 * Main system initialization file
 */

// Import document classes
import CavesOfQudActor from './documents/actor.mjs';
import CavesOfQudItem from './documents/item.mjs';

// Import sheet classes
import CavesOfQudActorSheet from './sheets/actor-sheet.mjs';
import CavesOfQudItemSheet from './sheets/item-sheet.mjs';

// Import helpers
import { CAVESOFQUD } from './helpers/config.mjs';
import * as cooldowns from './helpers/cooldowns.mjs';
import * as bodyparts from './helpers/bodyparts.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  console.log('Caves of Qud | Initializing Caves of Qud System');

  // Add utility classes to the global game object
  game.cavesofqud = {
    CavesOfQudActor,
    CavesOfQudItem,
    config: CAVESOFQUD,
    cooldowns,
    bodyparts,
    createHumanoidBody: bodyparts.createHumanoidBody  // Shortcut for console
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = CavesOfQudActor;
  CONFIG.Item.documentClass = CavesOfQudItem;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('cavesofqud', CavesOfQudActorSheet, {
    types: ['character', 'npc'],
    makeDefault: true,
    label: 'CAVESOFQUD.SheetLabels.Actor'
  });

  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('cavesofqud', CavesOfQudItemSheet, {
    types: ['weapon', 'armor', 'mutation', 'skill', 'cybernetic', 'artifact'],
    makeDefault: true,
    label: 'CAVESOFQUD.SheetLabels.Item'
  });

  // Preload Handlebars templates
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  // Register custom Handlebars helpers
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper('gt', function(a, b) {
    return a > b;
  });

  Handlebars.registerHelper('lt', function(a, b) {
    return a < b;
  });

  Handlebars.registerHelper('and', function(a, b) {
    return a && b;
  });
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function() {
  console.log('Caves of Qud | System Ready');
});

/* -------------------------------------------- */
/*  Preload Templates                           */
/* -------------------------------------------- */

async function preloadHandlebarsTemplates() {
  return loadTemplates([
    'systems/cavesofqud/templates/actor/character-sheet.hbs'
  ]);
}
