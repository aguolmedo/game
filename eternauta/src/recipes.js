// Recetas: los materiales del traje son los de la demo (diseño §5 / guion 2.5):
// tela + guantes + botas + tiras×2 + casco + lata (para el filtro).
export const RECIPES = [
  {
    id: 'traje',
    name: 'Traje aislante',
    description: 'Tela engomada, guantes, botas, tiras, casco y una lata para el filtro.',
    result: 'traje',
    station: 'bench_suit',
    needs: [
      { id: 'tela', n: 1 },
      { id: 'guantes', n: 1 },
      { id: 'botas', n: 1 },
      { id: 'tiras', n: 2 },
      { id: 'casco', n: 1 },
      { id: 'lata', n: 1 },
    ],
  },
];

export function getRecipe(id) {
  return RECIPES.find((recipe) => recipe.id === id) || null;
}

/** Ids de materiales que faltan para una receta, sin repetir. */
export function missingFor(slots, recipe) {
  if (!recipe) return [];
  const missing = [];
  for (const need of recipe.needs) {
    const have = slots.reduce(
      (sum, slot) => sum + (slot && slot.id === need.id ? slot.count : 0), 0,
    );
    if (have < need.n && !missing.includes(need.id)) missing.push(need.id);
  }
  return missing;
}
