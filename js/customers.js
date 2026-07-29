/**
 * customers.js
 * ─────────────────────────────────────────────────────────────────────────
 * Zona 1: la fila de clientes. Cada Customer es un dato simple (nombre,
 * pedido, paciencia); CustomerManager decide CUÁNDO aparece un cliente
 * nuevo y con qué pedido, según el nivel del jugador (dificultad
 * progresiva pedida en el diseño: nivel 1 solo bebidas tier 1, etc.).
 * ─────────────────────────────────────────────────────────────────────────
 */

/** A qué tier de RECIPES da acceso cada nivel de jugador (ver recipes.js). */
function tierParaNivel(nivel) {
  if (nivel >= 4) return 4;
  if (nivel === 3) return 3;
  if (nivel === 2) return 2;
  return 1;
}

/**
 * Paciencia FIJA (ms) por nivel — el reto pedido en el diseño: cada nivel
 * corta el tiempo disponible, hasta un nivel 4 pensado para ser casi
 * imposible de superar (nadie debería pasarlo). Sin nivel 5.
 * +20s sobre los valores originales (60/30/15/7) — el primer ajuste se sintió
 * demasiado duro combinado con los 10s de la máquina, así que se dio más
 * aire aquí y se bajó el tiempo de máquina (ver recipes.js).
 */
const PACIENCIA_MS_POR_NIVEL = { 1: 80000, 2: 50000, 3: 35000, 4: 27000 };
function pacienciaParaNivel(nivel) {
  return PACIENCIA_MS_POR_NIVEL[Math.min(4, Math.max(1, nivel))];
}

const NOMBRES_CLIENTES = [
  'Camila', 'Andrés', 'Valentina', 'Santiago', 'Isabella', 'Mateo', 'Sofía', 'Nicolás',
  'Lucía', 'Samuel', 'Daniela', 'Julián', 'Mariana', 'Emilio', 'Renata', 'Tomás',
];

/** Los 6 bustos de cliente (símbolos SVG en index.html), cada uno con su color de acento para la tarjeta. */
const AVATARES_CLIENTES = [
  { icon: 'cliente-1', color: '#E2603E' },
  { icon: 'cliente-2', color: '#3E6FA6' },
  { icon: 'cliente-3', color: '#C9A227' },
  { icon: 'cliente-4', color: '#7B5EA6' },
  { icon: 'cliente-5', color: '#3C8A82' },
  { icon: 'cliente-6', color: '#2E3A4E' },
];

let _idClienteSiguiente = 1;

class Customer {
  /**
   * @param {object} receta  Objeto de RECIPES (el pedido de este cliente).
   * @param {number} pacienciaMs  Tiempo total antes de irse, en milisegundos.
   */
  constructor(receta, pacienciaMs) {
    this.id = _idClienteSiguiente++;
    this.nombre = NOMBRES_CLIENTES[Math.floor(Math.random() * NOMBRES_CLIENTES.length)];
    const avatar = AVATARES_CLIENTES[Math.floor(Math.random() * AVATARES_CLIENTES.length)];
    this.avatarIcon = avatar.icon;
    this.colorAvatar = avatar.color;
    this.receta = receta;
    this.pacienciaTotalMs = pacienciaMs;
    this.pacienciaRestanteMs = pacienciaMs;
    this.llegadaMs = performance.now();
  }

  /** Fracción de paciencia restante (0-1), para la barra visual. */
  fraccionPaciencia() {
    return Math.max(0, this.pacienciaRestanteMs / this.pacienciaTotalMs);
  }

  /** Segundos transcurridos desde que llegó (usado para el bono "muy rápido"). */
  segundosEsperando() {
    return (performance.now() - this.llegadaMs) / 1000;
  }
}

class CustomerManager {
  constructor() {
    /** @type {Customer[]} */
    this.cola = [];
    this.maxCola = 4;
    this._msHastaProximoCliente = this._calcularIntervaloSpawn(1);
  }

  /**
   * Intervalo aleatorio entre llegadas. Se acorta en niveles altos para que
   * la fila siga llegando rápido aunque cada cliente aguante muchísimo
   * menos — así la presión sube junto con la paciencia más corta, en vez
   * de que el jugador simplemente espere con la fila vacía.
   */
  _calcularIntervaloSpawn(nivel) {
    const base = Math.max(2200, 4500 - nivel * 300);
    return base + Math.random() * 2000;
  }

  /** Duración de paciencia de un cliente nuevo: fija por nivel (ver PACIENCIA_MS_POR_NIVEL). */
  _calcularPaciencia(nivel) {
    return pacienciaParaNivel(nivel);
  }

  /**
   * Avanza el reloj del juego: baja la paciencia de todos los clientes y,
   * si corresponde, agrega uno nuevo a la fila.
   *
   * @param {number} deltaMs  Milisegundos transcurridos desde el último tick.
   * @param {number} nivelJugador
   * @returns {{expirados: Customer[], nuevo: Customer|null}}
   */
  actualizar(deltaMs, nivelJugador) {
    const expirados = [];
    for (const cliente of this.cola) {
      cliente.pacienciaRestanteMs -= deltaMs;
    }
    this.cola = this.cola.filter((c) => {
      if (c.pacienciaRestanteMs <= 0) { expirados.push(c); return false; }
      return true;
    });

    let nuevo = null;
    this._msHastaProximoCliente -= deltaMs;
    if (this._msHastaProximoCliente <= 0 && this.cola.length < this.maxCola) {
      nuevo = this._generarCliente(nivelJugador);
      this.cola.push(nuevo);
      this._msHastaProximoCliente = this._calcularIntervaloSpawn(nivelJugador);
    }

    return { expirados, nuevo };
  }

  /** Crea un cliente nuevo con un pedido válido para el nivel actual del jugador. */
  _generarCliente(nivelJugador) {
    const tier = tierParaNivel(nivelJugador);
    const posibles = recetasHastaTier(tier);
    const receta = posibles[Math.floor(Math.random() * posibles.length)];
    return new Customer(receta, this._calcularPaciencia(nivelJugador));
  }

  /** Quita a un cliente de la fila (ya fue atendido). */
  quitar(idCliente) {
    this.cola = this.cola.filter((c) => c.id !== idCliente);
  }

  /** Busca un cliente por id. */
  buscar(idCliente) {
    return this.cola.find((c) => c.id === idCliente) || null;
  }
}
