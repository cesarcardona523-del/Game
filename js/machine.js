/**
 * machine.js
 * ─────────────────────────────────────────────────────────────────────────
 * Zona 2: la máquina de espresso. Es una máquina de estados simple — solo
 * puede correr UN proceso a la vez (como una máquina real: si estás
 * extrayendo espresso no puedes vaporizar leche al mismo tiempo). Cada
 * proceso tarda lo que define INGREDIENTS[id].duracionMs.
 *
 * Este módulo no toca el DOM directamente: expone callbacks
 * (onInicio/onProgreso/onCompletar) que ui.js y game.js usan para animar y
 * reaccionar. Así machine.js se puede probar o reutilizar sin navegador.
 * ─────────────────────────────────────────────────────────────────────────
 */

class EspressoMachine {
  constructor() {
    /** @type {string|null} id del proceso en curso, o null si está libre. */
    this.procesoActivo = null;
    this._rafId = null;
    this._inicioMs = 0;
    this._duracionMs = 0;
    this._onProgreso = null;
    this._onCompletar = null;
  }

  /** true si la máquina está ocupada preparando algo. */
  estaOcupada() {
    return this.procesoActivo !== null;
  }

  /**
   * Inicia un proceso (uno de PROCESOS_MAQUINA). No hace nada si la máquina
   * ya está ocupada o si el id no es un proceso válido de máquina.
   *
   * @param {string} idProceso       Id del ingrediente/proceso (ej. 'espresso').
   * @param {(fraccion:number)=>void} onProgreso  Se llama cada frame con 0-1.
   * @param {(idProceso:string)=>void} onCompletar Se llama una vez al terminar.
   * @returns {boolean} true si el proceso arrancó.
   */
  iniciar(idProceso, onProgreso, onCompletar) {
    if (this.estaOcupada()) return false;
    const def = INGREDIENTS[idProceso];
    if (!def || def.origen !== 'maquina') return false;

    this.procesoActivo = idProceso;
    this._inicioMs = performance.now();
    this._duracionMs = def.duracionMs;
    this._onProgreso = onProgreso;
    this._onCompletar = onCompletar;
    this._tick();
    return true;
  }

  /** Loop interno vía requestAnimationFrame — reporta progreso suave para la animación de llenado. */
  _tick() {
    const ahora = performance.now();
    const fraccion = Math.min(1, (ahora - this._inicioMs) / this._duracionMs);
    if (this._onProgreso) this._onProgreso(fraccion);

    if (fraccion >= 1) {
      const idTerminado = this.procesoActivo;
      this.procesoActivo = null;
      if (this._onCompletar) this._onCompletar(idTerminado);
      return;
    }
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  /** Cancela cualquier proceso en curso sin completar (no se usa en el flujo normal, útil para reiniciar). */
  cancelar() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this.procesoActivo = null;
  }
}

// Expuesto para tests (Node/CommonJS). No afecta la carga como <script> en el
// navegador, donde `module` no existe.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EspressoMachine };
}
