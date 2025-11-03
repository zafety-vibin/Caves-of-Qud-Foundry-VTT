/**
 * Body Parts System for Caves of Qud
 * Handles hierarchical body part management
 * Source: https://wiki.cavesofqud.com/wiki/Modding:Bodies
 */

import { CAVESOFQUD } from './config.mjs';

/**
 * Counter for generating unique body part IDs
 */
let bodyPartIdCounter = 0;

/**
 * Generate a unique ID for a body part
 * @returns {string} Unique body part ID
 */
export function generateBodyPartId() {
  return `bp_${Date.now()}_${bodyPartIdCounter++}`;
}

/**
 * Create a new body part
 * @param {string} type - Body part type (Head, Arm, etc.)
 * @param {string} variant - Variant name (Skull, Robo-Arm, etc.) - defaults to first variant
 * @param {string} laterality - Laterality (Left, Right, etc.) - defaults to ""
 * @param {string} parentId - ID of parent body part - null for root
 * @returns {Object} Body part object
 */
export function createBodyPart(type, variant = null, laterality = "", parentId = null, chimeraOrigin = false) {
  const partType = CAVESOFQUD.bodyPartTypes[type];
  if (!partType) {
    console.error(`Unknown body part type: ${type}`);
    return null;
  }

  return {
    id: generateBodyPartId(),
    type: type,
    variant: variant || partType.variants[0],
    laterality: laterality,
    parent: parentId,
    children: [],
    equipment: null,
    properties: { ...partType.properties },
    chimeraOrigin: chimeraOrigin
  };
}

/**
 * Create standard humanoid body configuration
 * @returns {Object} { parts: {}, root: string } - Body parts object and root ID
 */
export function createHumanoidBody() {
  const parts = {};

  // Body (root)
  const body = createBodyPart('Body');
  parts[body.id] = body;

  // Head with Face
  const head = createBodyPart('Head', 'Head', '', body.id);
  parts[head.id] = head;
  body.children.push(head.id);

  const face = createBodyPart('Face', 'Face', '', head.id);
  parts[face.id] = face;
  head.children.push(face.id);

  // Back
  const back = createBodyPart('Back', 'Back', '', body.id);
  parts[back.id] = back;
  body.children.push(back.id);

  // Left Arm with Hand
  const leftArm = createBodyPart('Arm', 'Arm', 'Left', body.id);
  parts[leftArm.id] = leftArm;
  body.children.push(leftArm.id);

  const leftHand = createBodyPart('Hand', 'Hand', 'Left', leftArm.id);
  parts[leftHand.id] = leftHand;
  leftArm.children.push(leftHand.id);

  // Right Arm with Hand
  const rightArm = createBodyPart('Arm', 'Arm', 'Right', body.id);
  parts[rightArm.id] = rightArm;
  body.children.push(rightArm.id);

  const rightHand = createBodyPart('Hand', 'Hand', 'Right', rightArm.id);
  parts[rightHand.id] = rightHand;
  rightArm.children.push(rightHand.id);

  // Feet
  const feet = createBodyPart('Feet', 'Feet', '', body.id);
  parts[feet.id] = feet;
  body.children.push(feet.id);

  // Floating Nearby (utility slot)
  const floating = createBodyPart('FloatingNearby', 'Floating Nearby', '', body.id);
  parts[floating.id] = floating;
  body.children.push(floating.id);

  return { parts, root: body.id };
}

/**
 * Get all body parts of a specific type
 * @param {Object} bodyParts - Body parts object
 * @param {string} type - Body part type
 * @returns {Array} Array of matching parts
 */
export function getBodyPartsByType(bodyParts, type) {
  return Object.values(bodyParts).filter(part => part.type === type);
}

/**
 * Build a hierarchical tree structure for display
 * @param {Object} bodyParts - Body parts object
 * @param {string} startId - Starting part ID (usually root)
 * @param {number} depth - Current depth level
 * @returns {Array} Tree structure array
 */
export function buildBodyPartTree(bodyParts, startId = null, depth = 0) {
  // Find root if not specified
  if (!startId) {
    const root = Object.values(bodyParts).find(p => p.parent === null);
    if (!root) return [];
    startId = root.id;
  }

  const part = bodyParts[startId];
  if (!part) return [];

  const tree = [{
    part: part,
    depth: depth,
    children: []
  }];

  // Recursively build children
  for (let childId of part.children) {
    const childTree = buildBodyPartTree(bodyParts, childId, depth + 1);
    tree[0].children = tree[0].children.concat(childTree);
  }

  return tree;
}

/**
 * Flatten the tree structure for template iteration
 * @param {Array} tree - Tree structure from buildBodyPartTree
 * @returns {Array} Flat array with depth indicators
 */
export function flattenBodyPartTree(tree) {
  const flat = [];

  function traverse(nodes) {
    for (let node of nodes) {
      flat.push({
        part: node.part,
        depth: node.depth,
        hasChildren: node.children.length > 0
      });
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);
  return flat;
}

/**
 * Get display name for a body part
 * @param {Object} part - Body part object
 * @returns {string} Display name with laterality
 */
export function getBodyPartDisplayName(part) {
  let name = part.variant;
  if (part.laterality) {
    name = `${part.laterality} ${name}`;
  }
  return name;
}

/**
 * Check if a body part can equip items
 * @param {Object} part - Body part object
 * @returns {boolean}
 */
export function canEquipItem(part) {
  const partType = CAVESOFQUD.bodyPartTypes[part.type];
  return partType ? partType.canEquip : false;
}

/**
 * Check if a body part can wield weapons
 * @param {Object} part - Body part object
 * @returns {boolean}
 */
export function canWieldWeapon(part) {
  const partType = CAVESOFQUD.bodyPartTypes[part.type];
  return partType ? partType.canWield : false;
}

/**
 * Get all body parts that can equip items
 * @param {Object} bodyParts - Body parts object
 * @returns {Array} Array of equippable parts
 */
export function getEquippableBodyParts(bodyParts) {
  return Object.values(bodyParts).filter(part => canEquipItem(part));
}

/**
 * Get all body parts that can wield weapons
 * @param {Object} bodyParts - Body parts object
 * @returns {Array} Array of weapon-wielding parts
 */
export function getWieldingBodyParts(bodyParts) {
  return Object.values(bodyParts).filter(part => canWieldWeapon(part));
}

/**
 * Add a new body part as a child of another
 * @param {Object} bodyParts - Body parts object
 * @param {string} type - Body part type
 * @param {string} parentId - Parent part ID
 * @param {string} variant - Variant name (optional)
 * @param {string} laterality - Laterality (optional)
 * @returns {Object} New body part
 */
export function addBodyPart(bodyParts, type, parentId, variant = null, laterality = "") {
  const parent = bodyParts[parentId];
  if (!parent) {
    console.error(`Parent body part not found: ${parentId}`);
    return null;
  }

  const newPart = createBodyPart(type, variant, laterality, parentId);
  bodyParts[newPart.id] = newPart;
  parent.children.push(newPart.id);

  return newPart;
}

/**
 * Remove a body part and all its descendants
 * @param {Object} bodyParts - Body parts object
 * @param {string} partId - Part ID to remove
 * @returns {Array} Array of removed part IDs
 */
export function removeBodyPart(bodyParts, partId) {
  const part = bodyParts[partId];
  if (!part) return [];

  // Get all descendants recursively
  const descendants = [];
  function collectDescendants(id) {
    const p = bodyParts[id];
    if (!p) return;
    for (let childId of p.children) {
      descendants.push(childId);
      collectDescendants(childId);
    }
  }
  collectDescendants(partId);

  const removedIds = [partId, ...descendants];

  // Remove from parent's children list
  if (part.parent) {
    const parent = bodyParts[part.parent];
    if (parent) {
      parent.children = parent.children.filter(id => id !== partId);
    }
  }

  // Delete all parts
  for (let id of removedIds) {
    delete bodyParts[id];
  }

  return removedIds;
}

/**
 * Add body part with automatic child parts (e.g., Arm adds Hand)
 * @param {Object} bodyParts - Body parts object
 * @param {string} type - Body part type
 * @param {string} parentId - Parent part ID
 * @param {string} variant - Variant name (optional)
 * @param {string} laterality - Laterality (optional)
 * @param {Array} withChildren - Child part types to add automatically
 * @param {boolean} chimeraOrigin - Mark as Chimera-grown
 * @returns {Array} Array of all added part IDs [parentId, child1Id, child2Id...]
 */
export function addBodyPartWithChildren(bodyParts, type, parentId, variant = null, laterality = "", withChildren = [], chimeraOrigin = false) {
  const addedIds = [];

  // Add main part
  const mainPart = addBodyPart(bodyParts, type, parentId, variant, laterality);
  if (!mainPart) return addedIds;

  // Mark as chimera if specified
  if (chimeraOrigin) {
    mainPart.chimeraOrigin = true;
  }

  addedIds.push(mainPart.id);

  // Add children
  for (let childType of withChildren) {
    const childPart = addBodyPart(bodyParts, childType, mainPart.id, null, laterality);
    if (childPart) {
      if (chimeraOrigin) childPart.chimeraOrigin = true;
      addedIds.push(childPart.id);
    }
  }

  return addedIds;
}

/**
 * Roll for random Chimera body part type
 * Uses weighted selection per Qud wiki
 * @returns {string} Body part type
 */
export function rollChimeraBodyPart() {
  const weights = {
    'Hand': 3,
    'Arm': 3,
    'Head': 3,
    'Face': 3,
    'Feet': 3,
    'Fin': 1,
    'Tail': 1,
    'Roots': 1,
    'FungalOutcrop': 1
  };

  const total = 19;
  let roll = Math.floor(Math.random() * total);

  for (let [type, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll < 0) {
      return type;
    }
  }

  return 'Hand'; // Fallback
}

/**
 * Select random body part to be parent (for Chimera)
 * @param {Object} bodyParts - Body parts object
 * @returns {string} Random body part ID
 */
export function selectRandomParent(bodyParts) {
  const allParts = Object.values(bodyParts);
  if (allParts.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * allParts.length);
  return allParts[randomIndex].id;
}
