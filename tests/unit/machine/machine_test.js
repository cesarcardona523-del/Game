import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const { EspressoMachine } = require('../../../js/machine.js');

describe('EspressoMachine', () => {
  let machine;
  beforeEach(() => { machine = new EspressoMachine(); });
  afterEach(() => { machine.cancelar(); });

  it('is not busy and has no active process when created', () => {
    expect(machine.estaOcupada()).toBe(false);
    expect(machine.procesoActivo).toBeNull();
  });

  it('starts a valid machine process (origen: "maquina")', () => {
    const iniciado = machine.iniciar('espresso', () => {}, () => {});
    expect(iniciado).toBe(true);
    expect(machine.estaOcupada()).toBe(true);
    expect(machine.procesoActivo).toBe('espresso');
  });

  it('refuses to start a second process while already busy', () => {
    machine.iniciar('espresso', () => {}, () => {});
    const segundo = machine.iniciar('agua_caliente', () => {}, () => {});
    expect(segundo).toBe(false);
    expect(machine.procesoActivo).toBe('espresso');
  });

  it('refuses an ingredient whose origin is "estante", not "maquina" (e.g. leche)', () => {
    const iniciado = machine.iniciar('leche', () => {}, () => {});
    expect(iniciado).toBe(false);
    expect(machine.estaOcupada()).toBe(false);
  });

  it('refuses an unknown ingredient id', () => {
    const iniciado = machine.iniciar('no-existe', () => {}, () => {});
    expect(iniciado).toBe(false);
  });

  it('cancelar clears the active process and does not fire onCompletar', async () => {
    let completado = false;
    machine.iniciar('espresso', () => {}, () => { completado = true; });
    machine.cancelar();
    expect(machine.procesoActivo).toBeNull();
    expect(machine.estaOcupada()).toBe(false);
    // give any pending rAF a chance to run — it must not have fired onCompletar
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(completado).toBe(false);
  });

  it('frees up the machine to start a new process after cancelar', () => {
    machine.iniciar('espresso', () => {}, () => {});
    machine.cancelar();
    const iniciado = machine.iniciar('agua_caliente', () => {}, () => {});
    expect(iniciado).toBe(true);
    expect(machine.procesoActivo).toBe('agua_caliente');
  });
});
