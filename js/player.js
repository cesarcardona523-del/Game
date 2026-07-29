/**
 * player.js
 * ─────────────────────────────────────────────────────────────────────────
 * Estado del jugador: nivel, experiencia, dinero, reputación y estadísticas.
 * No conoce nada de DOM ni de recetas — solo lleva los números y las reglas
 * de progresión. game.js decide CUÁNDO llamar a sus métodos; ui.js decide
 * CÓMO mostrarlos.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Cuántos clientes hay que resolver (bien, mal o perdidos) para subir de nivel. */
const CLIENTES_POR_NIVEL = 10;
/** Nivel 4 es el tope: paciencia de 7s, pensado para ser casi imposible de superar — no hay nivel 5. */
const NIVEL_MAXIMO = 4;

class Player {
  constructor() {
    this.nivel = 1;
    this.clientesResueltos = 0; // cuenta para subir de nivel (servidos bien/mal + perdidos)
    this.dinero = 20; // capital inicial de la cafetería
    this.reputacion = 100; // 0-100
    this.clientesFelices = 0;
    this.clientesPerdidos = 0;
    this.pedidosAtendidos = 0;
    this.record = 0;
    this.puntosPartidaActual = 0;

    /** Extensión futura: máquinas/tazas/decoración desbloqueadas con dinero
     * (ver "Tienda" en README.md → Futuras versiones). Se deja el arreglo
     * listo para que Shop.js (no implementado aún) lo use directamente. */
    this.desbloqueos = ['taza_clasica', 'maquina_basica'];
  }

  /** Puntos de una partida (para el HUD y el récord); no afecta el dinero. */
  ganarPuntos(cantidad) {
    this.puntosPartidaActual += cantidad;
    if (this.puntosPartidaActual > this.record) this.record = this.puntosPartidaActual;
  }

  /** Otorga dinero (precio de la bebida servida, propina, etc.). */
  ganarDinero(cantidad) {
    this.dinero = Math.max(0, this.dinero + cantidad);
  }

  /**
   * Registra que un cliente quedó resuelto (servido bien, servido mal, o
   * perdido por paciencia agotada — los tres cuentan para avanzar de
   * dificultad). Cada 10 clientes sube un nivel, hasta el nivel 4 (que no
   * tiene techo: se queda ahí para siempre, a propósito).
   * @returns {number|null} el nivel nuevo si subió en esta llamada, o null.
   */
  registrarClienteResuelto() {
    this.clientesResueltos++;
    const nivelNuevo = Math.min(NIVEL_MAXIMO, Math.floor(this.clientesResueltos / CLIENTES_POR_NIVEL) + 1);
    if (nivelNuevo > this.nivel) { this.nivel = nivelNuevo; return nivelNuevo; }
    return null;
  }

  /** Cambia la reputación (0-100, nunca sale de ese rango). */
  cambiarReputacion(delta) {
    this.reputacion = Math.min(100, Math.max(0, this.reputacion + delta));
  }

  /** Progreso hacia el próximo nivel (0-1, para la barrita bajo "Nivel" en el HUD). */
  progresoNivel() {
    const resueltosEnNivel = this.clientesResueltos - (this.nivel - 1) * CLIENTES_POR_NIVEL;
    return Math.min(1, resueltosEnNivel / CLIENTES_POR_NIVEL);
  }

  /** Serializa el estado para guardarlo (ver save.js). */
  toJSON() {
    return {
      nivel: this.nivel, clientesResueltos: this.clientesResueltos, dinero: this.dinero, reputacion: this.reputacion,
      clientesFelices: this.clientesFelices, clientesPerdidos: this.clientesPerdidos,
      pedidosAtendidos: this.pedidosAtendidos, record: this.record, desbloqueos: this.desbloqueos,
    };
  }

  /**
   * Restaura el estado desde un objeto guardado previamente. Si viene de una
   * versión anterior con el sistema de niveles por XP (hasta nivel 10), se
   * recorta al nuevo tope de 4 y se recalcula clientesResueltos para que no
   * quede una partida vieja atascada en un nivel que ya no existe.
   */
  static fromJSON(datos) {
    const p = new Player();
    if (!datos) return p;
    Object.assign(p, datos);
    p.nivel = Math.min(NIVEL_MAXIMO, Math.max(1, p.nivel || 1));
    if (typeof datos.clientesResueltos !== 'number') {
      p.clientesResueltos = (p.nivel - 1) * CLIENTES_POR_NIVEL;
    }
    return p;
  }
}
