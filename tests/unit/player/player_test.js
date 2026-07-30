import { describe, it, expect, beforeEach } from 'vitest';
const { Player, CLIENTES_POR_NIVEL, NIVEL_MAXIMO } = require('../../../js/player.js');

describe('Player progression', () => {
  let player;
  beforeEach(() => { player = new Player(); });

  it('starts at level 1 with 0 resolved customers', () => {
    expect(player.nivel).toBe(1);
    expect(player.clientesResueltos).toBe(0);
  });

  it('levels up exactly at multiples of CLIENTES_POR_NIVEL', () => {
    for (let i = 1; i < CLIENTES_POR_NIVEL; i++) {
      expect(player.registrarClienteResuelto()).toBeNull();
    }
    expect(player.nivel).toBe(1);
    expect(player.registrarClienteResuelto()).toBe(2);
    expect(player.nivel).toBe(2);
  });

  it('caps at NIVEL_MAXIMO no matter how many more customers are resolved', () => {
    for (let i = 0; i < CLIENTES_POR_NIVEL * (NIVEL_MAXIMO + 5); i++) {
      player.registrarClienteResuelto();
    }
    expect(player.nivel).toBe(NIVEL_MAXIMO);
  });

  it('cambiarReputacion clamps to 0 on a large negative delta', () => {
    player.cambiarReputacion(-1000);
    expect(player.reputacion).toBe(0);
  });

  it('cambiarReputacion clamps to 100 on a large positive delta', () => {
    player.cambiarReputacion(1000);
    expect(player.reputacion).toBe(100);
  });

  it('ganarDinero never drops below 0', () => {
    player.dinero = 5;
    player.ganarDinero(-1000);
    expect(player.dinero).toBe(0);
  });

  it('progresoNivel is 0 at the start of a level and approaches 1 near the next', () => {
    expect(player.progresoNivel()).toBe(0);
    for (let i = 0; i < CLIENTES_POR_NIVEL - 1; i++) player.registrarClienteResuelto();
    expect(player.progresoNivel()).toBeCloseTo((CLIENTES_POR_NIVEL - 1) / CLIENTES_POR_NIVEL, 5);
  });

  describe('fromJSON migration', () => {
    it('clamps a legacy level above NIVEL_MAXIMO down to the new cap', () => {
      const restored = Player.fromJSON({ nivel: 10, dinero: 50, reputacion: 80 });
      expect(restored.nivel).toBe(NIVEL_MAXIMO);
    });

    it('derives clientesResueltos from nivel when the field is missing (old save)', () => {
      const restored = Player.fromJSON({ nivel: 3, dinero: 20, reputacion: 100 });
      expect(restored.clientesResueltos).toBe((3 - 1) * CLIENTES_POR_NIVEL);
    });

    it('returns a fresh Player when given null/undefined', () => {
      const restored = Player.fromJSON(null);
      expect(restored.nivel).toBe(1);
      expect(restored.dinero).toBe(20);
    });

    it('never lets nivel fall below 1 even with a corrupt value', () => {
      const restored = Player.fromJSON({ nivel: 0 });
      expect(restored.nivel).toBe(1);
    });
  });
});
