import { describe, it, expect } from 'vitest';
const { Inventory } = require('../../../js/inventory.js');
const { INGREDIENTS } = require('../../../js/recipes.js');

describe('Inventory', () => {
  it('starts with every INGREDIENTS id available (no shop/locking implemented yet)', () => {
    const inv = new Inventory();
    for (const id of Object.keys(INGREDIENTS)) {
      expect(inv.estaDisponible(id)).toBe(true);
    }
  });

  it('estaDisponible is false for an id that does not exist', () => {
    const inv = new Inventory();
    expect(inv.estaDisponible('no-existe')).toBe(false);
  });

  it('desbloquear makes a previously-unavailable id available', () => {
    const inv = new Inventory();
    inv.disponibles.delete('miel');
    expect(inv.estaDisponible('miel')).toBe(false);
    inv.desbloquear('miel');
    expect(inv.estaDisponible('miel')).toBe(true);
  });

  it('listaEstante only returns ingredients currently in disponibles', () => {
    const inv = new Inventory();
    inv.disponibles = new Set(['espresso', 'leche']);
    const lista = inv.listaEstante();
    expect(lista.map((i) => i.id).sort()).toEqual(['espresso', 'leche']);
    expect(lista[0]).toMatchObject(INGREDIENTS[lista[0].id]);
  });
});
