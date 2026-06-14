export const WORKSHOP_STYLES = ['starlight', 'forest', 'ocean', 'volcano', 'frost', 'rainbow'] as const;
export type WorkshopStyle = typeof WORKSHOP_STYLES[number];

export const MATERIAL_TYPES = ['flower_fruit', 'honey_syrup', 'magic_crystal', 'sugar_powder', 'rare_dew'] as const;
export type MaterialType = typeof MATERIAL_TYPES[number];

export const MATERIAL_QUALITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type MaterialQuality = typeof MATERIAL_QUALITIES[number];

export const SPECIAL_EFFECTS = ['sparkle', 'invisibility', 'flying_kiss', 'time_freeze', 'luck_boost', 'healing'] as const;
export type SpecialEffect = typeof SPECIAL_EFFECTS[number];

export const AFFIXES = ['shimmering', 'ancient', 'enchanted', 'celestial', 'mystic', 'divine'] as const;
export type Affix = typeof AFFIXES[number];

export const CONTEST_STATUS = ['scheduled', 'ongoing', 'completed'] as const;
export type ContestStatus = typeof CONTEST_STATUS[number];

export const TRADE_STATUS = ['listed', 'pending', 'completed', 'cancelled'] as const;
export type TradeStatus = typeof TRADE_STATUS[number];

export const RECIPE_STATUS = ['pending', 'approved', 'rejected'] as const;
export type RecipeStatus = typeof RECIPE_STATUS[number];

export const APPRENTICE_RANKS = ['novice', 'apprentice', 'journeyman', 'expert', 'master'] as const;
export type ApprenticeRank = typeof APPRENTICE_RANKS[number];

export const QUALITY_MULTIPLIERS: Record<MaterialQuality, number> = {
  common: 1.0,
  uncommon: 1.25,
  rare: 1.5,
  epic: 2.0,
  legendary: 3.0,
};

export const AFFIX_CHANCES: Record<MaterialQuality, number> = {
  common: 0.02,
  uncommon: 0.05,
  rare: 0.12,
  epic: 0.25,
  legendary: 0.45,
};

export const CANDY_RARITY_MULTIPLIERS = [0.5, 0.7, 1.0, 1.3, 1.8, 2.5];
