import { describe, it, expect } from 'vitest';
const { INGREDIENTS, RECIPES, obtenerReceta, recetasHastaTier } = require('../../../js/recipes.js');

describe('recipes.js', () => {
  it('obtenerReceta returns the recipe matching the given id', () => {
    const receta = obtenerReceta('latte');
    expect(receta).toBeDefined();
    expect(receta.nombre).toBe('Latte');
  });

  it('obtenerReceta returns undefined for an unknown id', () => {
    expect(obtenerReceta('no-existe')).toBeUndefined();
  });

  it.each([1, 2, 3, 4])('recetasHastaTier(%i) only returns recipes at or below that tier', (tierMax) => {
    const recetas = recetasHastaTier(tierMax);
    expect(recetas.length).toBeGreaterThan(0);
    for (const r of recetas) {
      expect(r.tier).toBeLessThanOrEqual(tierMax);
    }
  });

  it('recetasHastaTier(4) includes every recipe in the catalog', () => {
    expect(recetasHastaTier(4).length).toBe(RECIPES.length);
  });

  it('every recipe step references an id that exists in INGREDIENTS', () => {
    for (const receta of RECIPES) {
      for (const pasoId of receta.pasos) {
        expect(INGREDIENTS[pasoId], `${receta.id} references unknown ingredient "${pasoId}"`).toBeDefined();
      }
    }
  });
});
