import { describe, it, expect } from 'vitest';
const {
  CustomerManager, Customer, tierParaNivel, pacienciaParaNivel, PACIENCIA_MS_POR_NIVEL,
} = require('../../../js/customers.js');
const { obtenerReceta } = require('../../../js/recipes.js');

describe('pacienciaParaNivel', () => {
  it.each([1, 2, 3, 4])('returns the fixed value from PACIENCIA_MS_POR_NIVEL for level %i', (nivel) => {
    expect(pacienciaParaNivel(nivel)).toBe(PACIENCIA_MS_POR_NIVEL[nivel]);
  });

  it('clamps levels below 1 to level 1\'s patience', () => {
    expect(pacienciaParaNivel(0)).toBe(PACIENCIA_MS_POR_NIVEL[1]);
    expect(pacienciaParaNivel(-5)).toBe(PACIENCIA_MS_POR_NIVEL[1]);
  });

  it('clamps levels above 4 to level 4\'s patience', () => {
    expect(pacienciaParaNivel(5)).toBe(PACIENCIA_MS_POR_NIVEL[4]);
    expect(pacienciaParaNivel(99)).toBe(PACIENCIA_MS_POR_NIVEL[4]);
  });
});

describe('tierParaNivel', () => {
  it('maps level 1 -> tier 1, 2 -> 2, 3 -> 3, and 4+ -> tier 4', () => {
    expect(tierParaNivel(1)).toBe(1);
    expect(tierParaNivel(2)).toBe(2);
    expect(tierParaNivel(3)).toBe(3);
    expect(tierParaNivel(4)).toBe(4);
    expect(tierParaNivel(99)).toBe(4);
  });
});

describe('CustomerManager', () => {
  it('reports a customer as expired and removes it from the queue once patience hits 0', () => {
    const manager = new CustomerManager();
    const receta = obtenerReceta('espresso');
    const cliente = new Customer(receta, 1000);
    manager.cola.push(cliente);

    const { expirados } = manager.actualizar(1500, 1);

    expect(expirados).toHaveLength(1);
    expect(expirados[0].id).toBe(cliente.id);
    expect(manager.cola).toHaveLength(0);
  });

  it('keeps a customer in the queue while patience remains', () => {
    const manager = new CustomerManager();
    const receta = obtenerReceta('espresso');
    const cliente = new Customer(receta, 5000);
    manager.cola.push(cliente);

    const { expirados } = manager.actualizar(1000, 1);

    expect(expirados).toHaveLength(0);
    expect(manager.cola).toHaveLength(1);
    expect(manager.cola[0].pacienciaRestanteMs).toBe(4000);
  });

  it('never exceeds maxCola queued customers even when forced to spawn repeatedly', () => {
    const manager = new CustomerManager();
    for (let i = 0; i < 20; i++) {
      manager._msHastaProximoCliente = 0; // force a spawn attempt this tick
      manager.actualizar(0, 1);
    }
    expect(manager.cola.length).toBeLessThanOrEqual(manager.maxCola);
  });

  it('only generates orders at or below the tier mapped from the player level', () => {
    const manager = new CustomerManager();
    const nivel = 2;
    const tierMax = tierParaNivel(nivel);
    for (let i = 0; i < 30; i++) {
      manager.cola = []; // make room so the spawn isn't skipped for being full
      manager._msHastaProximoCliente = 0;
      const { nuevo } = manager.actualizar(0, nivel);
      if (nuevo) expect(nuevo.receta.tier).toBeLessThanOrEqual(tierMax);
    }
  });
});
