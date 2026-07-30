import { describe, it, expect } from 'vitest';
const { pasosCoinciden, calcularServirCorrecto, calcularServirIncorrecto, UMBRAL_PERFECTO_S, UMBRAL_RAPIDO_S } = require('../../../js/scoring.js');

function clienteFake(fraccionPaciencia, precio) {
  return {
    fraccionPaciencia: () => fraccionPaciencia,
    receta: { precio },
  };
}

describe('pasosCoinciden', () => {
  it('is true when ingredients match in the same order', () => {
    expect(pasosCoinciden(['espresso', 'agua_caliente'], ['espresso', 'agua_caliente'])).toBe(true);
  });

  it('is false when the same ingredients are in a different order (design rule)', () => {
    expect(pasosCoinciden(['agua_caliente', 'espresso'], ['espresso', 'agua_caliente'])).toBe(false);
  });

  it('is false when lengths differ, even if a prefix matches', () => {
    expect(pasosCoinciden(['espresso'], ['espresso', 'agua_caliente'])).toBe(false);
    expect(pasosCoinciden(['espresso', 'agua_caliente', 'miel'], ['espresso', 'agua_caliente'])).toBe(false);
  });

  it('is true for two empty arrays', () => {
    expect(pasosCoinciden([], [])).toBe(true);
  });
});

describe('calcularServirCorrecto', () => {
  it(`awards 150 "Perfecto" at exactly the ${UMBRAL_PERFECTO_S}s threshold`, () => {
    const r = calcularServirCorrecto(clienteFake(1, 4), UMBRAL_PERFECTO_S);
    expect(r.esPerfecto).toBe(true);
    expect(r.esRapido).toBe(false);
    expect(r.etiqueta).toBe('¡Perfecto! +150');
  });

  it(`falls to "Muy rápido" just past the perfect threshold`, () => {
    const r = calcularServirCorrecto(clienteFake(1, 4), UMBRAL_PERFECTO_S + 0.01);
    expect(r.esPerfecto).toBe(false);
    expect(r.esRapido).toBe(true);
    expect(r.etiqueta).toBe('¡Muy rápido! +150');
  });

  it(`awards "Muy rápido" at exactly the ${UMBRAL_RAPIDO_S}s threshold`, () => {
    const r = calcularServirCorrecto(clienteFake(1, 4), UMBRAL_RAPIDO_S);
    expect(r.esRapido).toBe(true);
  });

  it('falls to plain "Correcto" just past the fast threshold', () => {
    const r = calcularServirCorrecto(clienteFake(1, 4), UMBRAL_RAPIDO_S + 0.01);
    expect(r.esPerfecto).toBe(false);
    expect(r.esRapido).toBe(false);
    expect(r.etiqueta).toBe('¡Correcto! +100');
  });

  it('base points: perfecto=150, rapido=150 (100+50), correcto=100 — before the happy-customer bonus', () => {
    // fraccionPaciencia exactly 0.5 is NOT > 0.5, so no happy bonus applies here.
    expect(calcularServirCorrecto(clienteFake(0.5, 4), UMBRAL_PERFECTO_S).puntos).toBe(150);
    expect(calcularServirCorrecto(clienteFake(0.5, 4), UMBRAL_RAPIDO_S).puntos).toBe(150);
    expect(calcularServirCorrecto(clienteFake(0.5, 4), UMBRAL_RAPIDO_S + 1).puntos).toBe(100);
  });

  it('clienteContento requires patience fraction strictly greater than 0.5', () => {
    expect(calcularServirCorrecto(clienteFake(0.5, 4), 20).clienteContento).toBe(false);
    expect(calcularServirCorrecto(clienteFake(0.5001, 4), 20).clienteContento).toBe(true);
  });

  it('adds a +20 point and +3 reputation bonus for a happy customer, +1 otherwise', () => {
    const contento = calcularServirCorrecto(clienteFake(0.9, 4), 20);
    const noContento = calcularServirCorrecto(clienteFake(0.1, 4), 20);
    expect(contento.puntos).toBe(120); // 100 + 20
    expect(contento.deltaReputacion).toBe(3);
    expect(noContento.puntos).toBe(100);
    expect(noContento.deltaReputacion).toBe(1);
  });

  it('adds a $1 bonus to the recipe price only when the serve was perfect', () => {
    expect(calcularServirCorrecto(clienteFake(0.9, 4), UMBRAL_PERFECTO_S).dinero).toBe(5);
    expect(calcularServirCorrecto(clienteFake(0.9, 4), UMBRAL_RAPIDO_S).dinero).toBe(4);
  });
});

describe('calcularServirIncorrecto', () => {
  it('charges the base 50-point penalty when every ingredient is wrong', () => {
    const r = calcularServirIncorrecto(['leche'], ['espresso']);
    expect(r.ingredientesMal).toBe(1);
    expect(r.total).toBe(80); // 50 + 1*30
  });

  it('charges 50 flat when arrays are equal length and fully mismatched at every position counts each', () => {
    const r = calcularServirIncorrecto(['leche', 'miel'], ['espresso', 'canela']);
    expect(r.ingredientesMal).toBe(2);
    expect(r.total).toBe(110); // 50 + 2*30
  });

  it('counts extra/missing positions (different lengths) as mismatches too', () => {
    const r = calcularServirIncorrecto(['espresso', 'leche', 'miel'], ['espresso']);
    expect(r.ingredientesMal).toBe(2); // positions 1 and 2 exist in preparado but not esperado
    expect(r.total).toBe(110);
  });

  it('reputation penalty scales with the number of wrong ingredients', () => {
    expect(calcularServirIncorrecto(['leche'], ['espresso']).deltaReputacion).toBe(-10); // -(8 + 1*2)
    expect(calcularServirIncorrecto(['leche', 'miel'], ['espresso', 'canela']).deltaReputacion).toBe(-12); // -(8 + 2*2)
  });
});
