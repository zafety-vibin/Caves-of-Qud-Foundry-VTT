# Caves of Qud Foundry-VTT
A currently incomplete translation of the Caves of Qud ruleset and mechanics to a Foundry Virtual Tabletop game system.
This game system attempts to mimic the Caves of Qud game wiki but certain mechanics (Ex: Quickness) may be changed to fit a more traditional TTRPG and group experience.

## Quickstart
```
1. Copy this folder to your Foundry VTT `Data/systems/` directory

2. Rename the folder to `cavesofqud` or what you'd prefer

3. Restart Foundry VTT

4. Create a new world and select "Caves of Qud" as the game system

5. Run the mutations setup script

// Get the mutations compendium
const pack = game.packs.get('cavesofqud.physicalmutations');

if (!pack) {
  ui.notifications.error("Compendium 'cavesofqud.physicalmutations' not found! Make sure system is installed correctly.");
  throw new Error("Pack not found");
}

// Multiple Arms Mutation
let item = await Item.create({
  name: "Multiple Arms",
  type: "mutation",
  img: "systems/cavesofqud/assets/icons/physicalmutations/Multiple_arms_mutation.png",
  system: {
    mutationType: "physical",
    mpCost: 4,
    level: 1,
    effect: "You have two additional arms and hands. Each hand has a chance to make an extra attack per turn.",
    description: "<p>You grow two additional arms, each with a functional hand. This allows you to wield more weapons and wear more equipment simultaneously.</p><p><strong>Trade-off:</strong> Arm armor values average across all arms - you need 4 bracers to maintain protection!</p>",
    bodyModifications: [
      {
        action: 'add',
        type: 'Arm',
        parent: 'Body',
        variant: 'Arm',
        laterality: 'Left',
        withChildren: ['Hand']
      },
      {
        action: 'add',
        type: 'Arm',
        parent: 'Body',
        variant: 'Arm',
        laterality: 'Right',
        withChildren: ['Hand']
      }
    ],
    addedBodyParts: [],
    isActive: false
  }
});
await pack.importDocument(item);
await item.delete();

// Multiple Legs Mutation
item = await Item.create({
  name: "Multiple Legs",
  type: "mutation",
  img: "systems/cavesofqud/assets/icons/physicalmutations/Multiple_legs_mutation.png",
  system: {
    mutationType: "physical",
    mpCost: 5,
    level: 1,
    effect: "You have an extra set of legs. Movement speed +(Level × 20), carry capacity +(Level + 5)%.",
    description: "<p>You grow an additional pair of legs, increasing your mobility and load-bearing capacity.</p><p><strong>Trade-off:</strong> Footwear armor averages across both feet slots.</p>",
    bodyModifications: [
      {
        action: 'add',
        type: 'Feet',
        parent: 'Body',
        variant: 'Feet',
        laterality: '',
        withChildren: []
      }
    ],
    addedBodyParts: [],
    isActive: false,
    statBonuses: {
      carryCapacity: { type: "formula", value: 0, formula: "level + 5" },
      movementSpeed: { type: "formula", value: 0, formula: "level * 20" },
      quickness: { type: "flat", value: 0, formula: "" }
    }
  }
});
await pack.importDocument(item);
await item.delete();

// Two-headed Mutation
item = await Item.create({
  name: "Two-headed",
  type: "mutation",
  img: "systems/cavesofqud/assets/icons/physicalmutations/twoheaded_mutation.png",
  system: {
    mutationType: "physical",
    mpCost: 3,
    level: 1,
    effect: "You have an extra head. Mental action costs reduced by (5 × Level + 15)%. 50% chance per turn to shake off mental status effects.",
    description: "<p>You possess two fully functional heads, each with its own face. This grants enhanced mental processing and resistance to decapitation.</p><p><strong>Trade-off:</strong> Helmet armor averages across both heads.</p><p><strong>Benefit:</strong> You can survive losing one head!</p>",
    bodyModifications: [
      {
        action: 'add',
        type: 'Head',
        parent: 'Body',
        variant: 'Head',
        laterality: '',
        withChildren: ['Face']
      }
    ],
    addedBodyParts: [],
    isActive: false
  }
});
await pack.importDocument(item);
await item.delete();

// Chimera Mutation
item = await Item.create({
  name: "Chimera",
  type: "mutation",
  img: "systems/cavesofqud/assets/icons/physicalmutations/chimera_mutation.png",
  system: {
    mutationType: "physical",
    mpCost: 0,
    level: 1,
    effect: "You are a morphotype. When gaining mutations, you may grow additional random body parts from random locations.",
    description: "<p><strong>YOU ARE CHAOS INCARNATE.</strong></p><p>Your body defies normal anatomy. New limbs, faces, and appendages can sprout from anywhere - hands, heads, other limbs. A face might grow from your hand. An arm might emerge from your head.</p><p>Each time this mutation triggers, a random body part (weighted: hands, arms, heads, faces most common) grows from a random existing body part.</p><p><strong>Warning:</strong> If a parent part is severed, all parts growing from it are also lost!</p>",
    bodyModifications: [
      {
        action: 'add',
        type: 'random',
        parent: 'random',
        variant: 'auto',
        laterality: '',
        withChildren: [],
        chimeraOrigin: true
      }
    ],
    addedBodyParts: [],
    isActive: false
  }
});
await pack.importDocument(item);
await item.delete();

// Burrowing Claws Mutation (F005 - Natural Weapons)
item = await Item.create({
  name: "Burrowing Claws",
  type: "mutation",
  img: "systems/cavesofqud/assets/icons/physicalmutations/Burrowing_claws_mutation.png",
  system: {
    mutationType: "physical",
    mpCost: 3,
    level: 1,
    effect: "Your hands transform into powerful burrowing claws. They act as Short Blade weapons that scale with mutation level.",
    description: "<p>Your hands transform into vicious claws. These natural weapons can still equip weapons and equipment normally.</p><p><strong>Combat:</strong> Claws are default weapon when hands are empty. Equipping regular weapons overrides claws.</p><p><strong>Damage scales with level:</strong> 1d2-1 at level 1, up to 1d12-1 at level 18+</p>",
    bodyModifications: [
      {
        action: 'replace',
        targetType: 'Hand',
        newType: 'BurrowingClaw',
        preserveEquipment: true,
        preserveChildren: false
      }
    ],
    addedBodyParts: [],
    createdItems: [],
    isActive: false,
    createWeaponOnReplace: true,
    naturalWeapon: {
      enabled: false,
      bodyPartTypes: ["BurrowingClaw"],
      weaponClass: "Short Blade",
      damageFormula: "BurrowingClaws",
      pv: 0,
      attackChance: 100
    },
    blockedEquipment: {},
    providesArmor: {
      enabled: false,
      bodyPartType: "",
      avFormula: ""
    },
    resourceTracking: {
      enabled: false,
      resourceName: "",
      maxFormula: "",
      current: 0
    }
  }
});
await pack.importDocument(item);
await item.delete();

// Horns Mutation (F005 - Natural Weapons)
item = await Item.create({
  name: "Horns",
  type: "mutation",
  img: "systems/cavesofqud/assets/icons/physicalmutations/horns_mutation.png",
  system: {
    mutationType: "physical",
    mpCost: 4,
    level: 1,
    effect: "Your head grows horns that provide armor and can be used as a weapon. 20% chance to gore when attacking with other weapons.",
    description: "<p>Magnificent horns grow from your head. They provide natural armor but prevent wearing helmets.</p><p><strong>Combat:</strong> Horns can be designated as main hand (100% attack) or attack as offhand (20% gore chance).</p><p><strong>Armor:</strong> Provides AV scaling with level. Weightless, no DV penalty.</p><p><strong>Restriction:</strong> Cannot equip helmets or head armor while horns are active.</p>",
    bodyModifications: [],
    addedBodyParts: [],
    isActive: false,
    naturalWeapon: {
      enabled: true,
      bodyPartTypes: ["Head"],
      weaponClass: "Short Blade",
      damageFormula: "Horns",
      pv: 0,
      attackChance: 20
    },
    blockedEquipment: {
      "Head": ["armor"]
    },
    providesArmor: {
      enabled: true,
      bodyPartType: "Head",
      avFormula: "Horns"
    },
    resourceTracking: {
      enabled: false,
      resourceName: "",
      maxFormula: "",
      current: 0
    }
  }
});
await pack.importDocument(item);
await item.delete();

// Stinger (Paralyzing Venom) Mutation (F005 - Natural Weapons)
item = await Item.create({
  name: "Stinger (Paralyzing Venom)",
  type: "mutation",
  img: "systems/cavesofqud/assets/icons/physicalmutations/stinger_mutation.png",
  system: {
    mutationType: "physical",
    mpCost: 4,
    level: 1,
    effect: "You gain a tail with a stinger that can paralyze enemies. 20% chance to sting when attacking with other weapons.",
    description: "<p>A venomous stinger grows from your tail. It can attack as an offhand weapon with a 20% chance.</p><p><strong>Combat:</strong> Stinger is a Long Blade class weapon that scales with mutation level.</p><p><strong>Venom:</strong> Paralyzes target (simplified for MVP - full status effects in future feature).</p><p><strong>Restriction:</strong> Cannot equip tail armor while stinger is active.</p>",
    bodyModifications: [
      {
        action: 'add',
        type: 'Tail',
        parent: 'Body',
        variant: 'Tail',
        laterality: '',
        withChildren: []
      }
    ],
    addedBodyParts: [],
    isActive: false,
    naturalWeapon: {
      enabled: true,
      bodyPartTypes: ["Tail"],
      weaponClass: "Long Blade",
      damageFormula: "Stinger",
      pv: 0,
      attackChance: 20
    },
    blockedEquipment: {
      "Tail": ["armor"]
    },
    providesArmor: {
      enabled: false,
      bodyPartType: "",
      avFormula: ""
    },
    resourceTracking: {
      enabled: false,
      resourceName: "",
      maxFormula: "",
      current: 0
    }
  }
});
await pack.importDocument(item);
await item.delete();

// Stinger (Confusing Venom) Mutation (F005 - Natural Weapons)
item = await Item.create({
  name: "Stinger (Confusing Venom)",
  type: "mutation",
  img: "systems/cavesofqud/assets/icons/physicalmutations/stinger_mutation.png",
  system: {
    mutationType: "physical",
    mpCost: 4,
    level: 1,
    effect: "You gain a tail with a stinger that can confuse enemies. 20% chance to sting when attacking with other weapons.",
    description: "<p>A venomous stinger grows from your tail, delivering confusion-inducing venom.</p><p><strong>Combat:</strong> Same mechanics as Paralyzing Venom variant.</p><p><strong>Venom:</strong> Confuses target (simplified for MVP).</p>",
    bodyModifications: [
      {
        action: 'add',
        type: 'Tail',
        parent: 'Body',
        variant: 'Tail',
        laterality: '',
        withChildren: []
      }
    ],
    addedBodyParts: [],
    isActive: false,
    naturalWeapon: {
      enabled: true,
      bodyPartTypes: ["Tail"],
      weaponClass: "Long Blade",
      damageFormula: "Stinger",
      pv: 0,
      attackChance: 20
    },
    blockedEquipment: {
      "Tail": ["armor"]
    },
    providesArmor: {
      enabled: false,
      bodyPartType: "",
      avFormula: ""
    },
    resourceTracking: {
      enabled: false,
      resourceName: "",
      maxFormula: "",
      current: 0
    }
  }
});
await pack.importDocument(item);
await item.delete();

// Stinger (Poisoning Venom) Mutation (F005 - Natural Weapons)
item = await Item.create({
  name: "Stinger (Poisoning Venom)",
  type: "mutation",
  img: "systems/cavesofqud/assets/icons/physicalmutations/stinger_mutation.png",
  system: {
    mutationType: "physical",
    mpCost: 4,
    level: 1,
    effect: "You gain a tail with a stinger that can poison enemies. 20% chance to sting when attacking with other weapons.",
    description: "<p>A venomous stinger grows from your tail, delivering poisonous venom.</p><p><strong>Combat:</strong> Same mechanics as Paralyzing Venom variant.</p><p><strong>Venom:</strong> Poisons target (simplified for MVP).</p>",
    bodyModifications: [
      {
        action: 'add',
        type: 'Tail',
        parent: 'Body',
        variant: 'Tail',
        laterality: '',
        withChildren: []
      }
    ],
    addedBodyParts: [],
    isActive: false,
    naturalWeapon: {
      enabled: true,
      bodyPartTypes: ["Tail"],
      weaponClass: "Long Blade",
      damageFormula: "Stinger",
      pv: 0,
      attackChance: 20
    },
    blockedEquipment: {
      "Tail": ["armor"]
    },
    providesArmor: {
      enabled: false,
      bodyPartType: "",
      avFormula: ""
    },
    resourceTracking: {
      enabled: false,
      resourceName: "",
      maxFormula: "",
      current: 0
    }
  }
});
await pack.importDocument(item);
await item.delete();

// Quills Mutation (F005 - Natural Weapons)
item = await Item.create({
  name: "Quills",
  type: "mutation",
  img: "systems/cavesofqud/assets/icons/physicalmutations/Quills_mutation.png",
  system: {
    mutationType: "physical",
    mpCost: 4,
    level: 1,
    effect: "Your back grows protective quills that provide armor. Cannot wear back armor.",
    description: "<p>Sharp quills cover your back, providing natural armor that scales with mutation level.</p><p><strong>Armor:</strong> Provides AV based on quill count and level.</p><p><strong>Quills:</strong> Start with 300, increase with level. Quill count tracked (simplified - no regeneration/consumption for MVP).</p><p><strong>Restriction:</strong> Cannot equip back armor while quills are active.</p>",
    bodyModifications: [],
    addedBodyParts: [],
    isActive: false,
    naturalWeapon: {
      enabled: false,
      bodyPartTypes: [],
      weaponClass: "",
      damageFormula: "",
      pv: 0,
      attackChance: 100
    },
    blockedEquipment: {
      "Back": ["armor"]
    },
    providesArmor: {
      enabled: true,
      bodyPartType: "Back",
      avFormula: "Quills"
    },
    resourceTracking: {
      enabled: true,
      resourceName: "quills",
      maxFormula: "Quills",
      current: 300
    }
  }
});
await pack.importDocument(item);
await item.delete();

// Wings Mutation (F005 - Natural Weapons)
item = await Item.create({
  name: "Wings",
  type: "mutation",
  img: "systems/cavesofqud/assets/icons/physicalmutations/wings_mutation.png",
  system: {
    mutationType: "physical",
    mpCost: 4,
    level: 1,
    effect: "You grow wings that grant flight capability and enhanced movement speed.",
    description: "<p>Majestic wings sprout from your back, granting you the ability to fly.</p><p><strong>Flight:</strong> You gain a flying movement speed equal to your walking speed. This allows you to bypass ground obstacles and affects tactical positioning.</p><p><strong>Movement:</strong> Sprint speed increased by (10 + (level - 1) × 10)%.</p><p><strong>Back Slot:</strong> Cosmetically labeled 'Around Wings' but equipment functions normally.</p>",
    bodyModifications: [],
    addedBodyParts: [],
    isActive: false,
    naturalWeapon: {
      enabled: false,
      bodyPartTypes: [],
      weaponClass: "",
      damageFormula: "",
      pv: 0,
      attackChance: 100
    },
    blockedEquipment: {},
    providesArmor: {
      enabled: false,
      bodyPartType: "",
      avFormula: ""
    },
    resourceTracking: {
      enabled: false,
      resourceName: "",
      maxFormula: "",
      current: 0
    },
    statBonuses: {
      carryCapacity: { type: "flat", value: 0, formula: "" },
      movementSpeed: { type: "formula", value: 0, formula: "10 + (level - 1) * 10" },
      quickness: { type: "flat", value: 0, formula: "" }
    }
  }
});
await pack.importDocument(item);
await item.delete();

console.log("✅ Mutations compendium populated with 11 mutations!");
console.log("📦 Drag from Compendiums → Physical Mutations onto character sheets");

```
## Features

### Attributes System
- Six core attributes: STR, AGI, TOU, INT, WIL, EGO
- Modifier calculation: (value - 16) / 2

### Calculated Statistics
- **HP**: Level 1 = TOU value, +1d4+TOU mod per level
- **DV** (Dodge): 6 + AGI modifier
- **PV** (Penetration): 4 + STR modifier
- **MA** (Mental Armor): 4 + WIL modifier (Currently Not Implemented)
- **Carry Capacity**: 15 × STR value
- **Skill Points**: 70 TK/50 MUT base + (INT-10)×4 per level (Currently Not Implemented)
- **HP Regen**: (20+2×(WIL+TOU mods))/100 per turn (Currently Not Implemented)
- **Cooldown Reduction**: 5% per WIL above 16 (max 80%) (Currently Not Implemented)

### Limbs-based Equipment and Attack System
- Standard humanoid body-type array on Character or NPC sheet creation
```
      - Head 
      - Face
      - Back
  - Body
      - Left Arm
         - Left Hand
      - Right Arm
         - Right Hand
      - Feet
  - Floating Nearby
```
- Contains a modular limb attachment system with body as the root parent (Chimera Supported)
- Multiweapon fighting per total number of equipped weapons in hand and natural weapons
- Mutation override equipped body slot as necessary

### Implemented Mutations
- Chimera
- Burrowing Claws
- Horns
- Multiple Arms
- Multiple Legs
- Quills
- Stinger (Confusing/Paralyzing/Poisoning Venom Statuses Currently Not Implemented)
- Two Headed
- Wings

### Items and Armor
- Basic weapon and armor creation

## Planned Features

<details>
<summary><h3>Remaining Physical Mutations:</h3></summary>
<br>
Group 0: Beak

Group 1:
Carapace,
Electromagnetic Pulse,
Night Vision,
Regeneration,
Thick fur,
Triple-Jointed,
Two-Hearted

Group 2:
Electric-Generation,
Flaming Ray,
Freezing Ray,
Slime Glands

Group 3:
Doubled-Muscled,
Phasing,
Spinnerets

Deferred Quickness Rules:
Adrenal Control,
Heightened Quickness,
Photosynthetic Skin

Deferred Gas Rules:
Corrosive Gas Generation,
Sleep Gas Generation

Need Decision:
Heightened Hearing 
</details>

<details>
 <summary><h3>Mental Mutations:</h3></summary>
 <br> 
Group 1: 
Pyrokinesis,
Cryokinesis,
Disintegration,
Kindle,
Light Manipulation,
Stunning Force,
Sunder Mind,
Syphon Vim,
Confusion,

Group 2:
Telepathy,
Clairvoyance,
Mass Mind,
Psychometry,
Sense Psychic

Group 3:
Force Bubble,
Force Wall,
Ego Projection,
Precognition,
Teleport,
Teleport Other

Group 4:
Domination,
Beguiling,
Mental Mirror

Deferred Quickness Rules:
Time Dilation 

Need Decisions:
Temporal Fugue,
Space-Time Vortex,
Burgeoning
</details> 

### Skills
- Pruned or modified list 

### Status effects and on-hit effects
- Bleeding, Sleeping, Dismemberment, etc.

### Advanced Equipment and True Kin
- Items and more plus cybernetics system for true kin

### Character Creator and Advancement
- Level up

## Suggested TTRPG Translations

### Quickness:

### Gas Rules: 

### HP and Damage:

### Leveling and Balance:

______________________________________________

## License

Caves of Qud is copyright Freehold Games. This is an unofficial fan-made system.
                                                                                                      
