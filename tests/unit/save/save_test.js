import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const { SaveManager } = require('../../../js/save.js');
const { Player } = require('../../../js/player.js');

describe('SaveManager', () => {
  const clave = 'test.save.key';
  let save;

  beforeEach(() => {
    save = new SaveManager(clave);
    localStorage.clear();
  });

  it('round-trips a player\'s state: guardar() then cargar() returns the same plain object', () => {
    const player = new Player();
    player.ganarDinero(15);
    player.registrarClienteResuelto();

    save.guardar(player);
    const cargado = save.cargar();

    expect(cargado).toEqual(player.toJSON());
  });

  it('cargar() returns null when nothing has been saved yet', () => {
    expect(save.cargar()).toBeNull();
  });

  it('cargar() returns null instead of throwing on corrupted JSON', () => {
    localStorage.setItem(clave, '{not valid json');
    expect(() => save.cargar()).not.toThrow();
    expect(save.cargar()).toBeNull();
  });

  it('guardar() returns false instead of throwing when localStorage.setItem fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const player = new Player();
    expect(() => save.guardar(player)).not.toThrow();
    expect(save.guardar(player)).toBe(false);
    spy.mockRestore();
  });

  it('reiniciar() removes the saved key so cargar() returns null again', () => {
    save.guardar(new Player());
    expect(save.cargar()).not.toBeNull();
    save.reiniciar();
    expect(save.cargar()).toBeNull();
  });
});
