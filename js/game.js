/**
 * game.js
 * ─────────────────────────────────────────────────────────────────────────
 * El orquestador. Conecta Player, Inventory, CustomerManager, AudioEngine,
 * RadioEngine, Leaderboard, SaveManager y UIController.
 *
 * v2 — MULTITAREA: en vez de una sola taza/cliente activo, el jugador
 * dispone de `this.estaciones` (3 puestos de trabajo). Cada estación tiene
 * su PROPIA instancia de EspressoMachine, así que puede tener un espresso
 * extrayendo en la Estación 1 mientras se atiende a un cliente distinto en
 * la Estación 2 — nada bloquea nada más que a sí mismo. La máquina de
 * espresso es opcional: solo los ingredientes que la necesitan (café,
 * agua/leche caliente/fría/espumada) pasan por ella; el resto se agrega
 * directo desde la estantería sin esperar.
 * ─────────────────────────────────────────────────────────────────────────
 */

const NUM_ESTACIONES = 3;

class Game {
  constructor() {
    this.save = new SaveManager();
    this.player = Player.fromJSON(this.save.cargar());
    this.audio = new AudioEngine();
    this.radio = new RadioEngine();
    this.leaderboard = new Leaderboard();
    this.inventory = new Inventory();
    this.customers = new CustomerManager();
    this.ui = new UIController();

    /** @type {{id:number, cliente:Customer|null, capas:string[], maquina:EspressoMachine, inicioPreparacionMs:number|null}[]} */
    this.estaciones = Array.from({ length: NUM_ESTACIONES }, (_, i) => ({
      id: i + 1, cliente: null, capas: [], maquina: new EspressoMachine(), inicioPreparacionMs: null,
    }));
    /** @type {number|null} Id de la estación que recibe los clics de estantería/máquina. */
    this.estacionEnfocadaId = null;

    this._segundosJuego = 0;
    this._ultimoTickMs = null;
    /** true mientras la pestaña "Juego" no está a la vista en Coffee App — ver pausar()/reanudar(). */
    this._pausado = false;
  }

  /**
   * Coffee App llama esto (vía iframe.contentWindow.coffeeShopGame) cuando el
   * usuario navega a OTRA pestaña ("Métodos", etc.) — pedido explícito: "si
   * no estoy en el botón de Juego no debería estar el juego activo, ni
   * debería sonar música ni nada". Para la radio y congela el reloj del
   * juego (los clientes dejan de perder paciencia mientras nadie mira).
   */
  pausar() {
    if (this._pausado) return;
    this._pausado = true;
    // Solo reanudar la radio sola si sonaba de verdad (evita que un simple
    // vaivén de pestañas la ENCIENDA cuando el jugador ni había llegado a
    // presionar "Jugar" todavía).
    this._radioSonabaAlPausar = this.radio.reproduciendo;
    if (this.radio.reproduciendo) this.radio.pausar();
    this.ui.actualizarRadio(false, '');
  }

  /** Vuelve a activar el juego al volver a la pestaña "Juego". */
  reanudar() {
    if (!this._pausado) return;
    this._pausado = false;
    this._ultimoTickMs = performance.now();
    if (this._radioSonabaAlPausar) {
      this.radio.reproducir();
      this.ui.actualizarRadio(true, this.radio.pistaActual());
    }
  }

  init() {
    this.ui.renderBotonesMaquina((id) => this._iniciarProcesoMaquina(id));
    this.ui.renderEstaciones(this.estaciones, {
      onEnfocar: (id) => this._enfocarEstacion(id),
      onServir: (id) => this._servir(id),
      onVaciar: (id) => this._vaciarIngredientes(id),
      onClicIngrediente: (idEstacion, idIngrediente) => this._alClicIngredienteEstacion(idEstacion, idIngrediente),
    });
    this.estaciones.forEach((e) => this.ui.actualizarEstacion(e, false));
    this.ui.actualizarEnfoqueMaquina(null);
    this.ui.renderProgresoMaquinaEnfocada(null);

    const btnSilenciar = document.getElementById('btn-silenciar');
    btnSilenciar.addEventListener('click', () => {
      const silenciado = this.audio.alternarSilencio();
      btnSilenciar.textContent = silenciado ? '🔇' : '🔊';
    });
    document.getElementById('btn-reiniciar').addEventListener('click', () => this._reiniciarPartida());
    document.getElementById('btn-finalizar-turno').addEventListener('click', () => this._finalizarTurno());

    document.getElementById('btn-radio-play').addEventListener('click', () => {
      const reproduciendo = this.radio.alternar();
      this.ui.actualizarRadio(reproduciendo, this.radio.pistaActual());
    });
    document.getElementById('radio-volumen').addEventListener('input', (e) => {
      this.radio.setVolumen(Number(e.target.value) / 100);
    });
    this.radio.onCambioPista = (nombre) => this.ui.actualizarRadio(this.radio.reproduciendo, nombre);

    this.ui.el.formTurno.addEventListener('submit', (e) => { e.preventDefault(); this._enviarAlTop(); });
    this.ui.el.btnTurnoOmitir.addEventListener('click', () => this.ui.ocultarModalTurno());
    // btn-top-cerrar se conecta una sola vez en el listener de DOMContentLoaded
    // (al final del archivo) porque el botón "Ver TOP" del Home también lo usa
    // antes de que init() llegue a correr.
    document.getElementById('btn-top').addEventListener('click', () => this._mostrarTop());

    this.ui.renderHUD(this.player);

    this._ultimoTickMs = performance.now();
    requestAnimationFrame((t) => this._loop(t));

    setInterval(() => this.save.guardar(this.player), 15000);
    window.addEventListener('beforeunload', () => this.save.guardar(this.player));
  }

  _loop(ahoraMs) {
    if (this._pausado) {
      this._ultimoTickMs = ahoraMs; // evita un salto grande de deltaMs cuando se reanude
      requestAnimationFrame((t) => this._loop(t));
      return;
    }
    // Tope de 250ms: si el navegador pausó el rAF un momento (cambiar de
    // app en el celular, la barra de Safari escondiéndose al hacer scroll,
    // la transición a pantalla completa), el siguiente frame llega con un
    // deltaMs enorme — sin este tope, el juego "pone al día" de golpe
    // varios segundos: la paciencia de los clientes se desploma de repente
    // y pueden llegar 2-3 clientes en el mismo instante (ráfaga), lo que
    // infla el alto del contenido de golpe y descoordina el escalado de
    // ajustarEscalaPantalla. Con el tope, ese tiempo "de más" simplemente
    // se pierde (el juego no avanza más rápido para compensar).
    const deltaMs = Math.min(250, ahoraMs - this._ultimoTickMs);
    this._ultimoTickMs = ahoraMs;
    this._segundosJuego += deltaMs / 1000;

    const { expirados, nuevo } = this.customers.actualizar(deltaMs, this.player.nivel);
    if (nuevo) this.audio.campana();
    expirados.forEach((cliente) => this._alClientePerdido(cliente));

    if (nuevo || expirados.length) {
      this.ui.renderCola(this.customers.cola, this.estaciones, (id) => this._alSeleccionarCliente(id));
    } else {
      this.ui.actualizarPaciencias(this.customers.cola);
    }
    this.ui.renderTiempoRestante(this.customers.cola, this.estaciones);

    requestAnimationFrame((t) => this._loop(t));
  }

  _estacionEnfocada() {
    return this.estaciones.find((e) => e.id === this.estacionEnfocadaId) || null;
  }

  // ── Selección de cliente / enfoque de estación ─────────────────────────

  _alSeleccionarCliente(idCliente) {
    const yaAsignada = this.estaciones.find((e) => e.cliente && e.cliente.id === idCliente);
    if (yaAsignada) { this._enfocarEstacion(yaAsignada.id); return; }

    const libre = this.estaciones.find((e) => !e.cliente);
    if (!libre) {
      this.ui.mostrarFlotante('¡Todas las estaciones ocupadas!', 'negativo', this.estacionEnfocadaId || this.estaciones[0].id);
      return;
    }
    const cliente = this.customers.buscar(idCliente);
    if (!cliente) return;

    libre.cliente = cliente;
    libre.capas = [];
    libre.inicioPreparacionMs = performance.now();
    this._enfocarEstacion(libre.id);
    this.ui.renderCola(this.customers.cola, this.estaciones, (id) => this._alSeleccionarCliente(id));
  }

  _enfocarEstacion(id) {
    const anteriorId = this.estacionEnfocadaId;
    this.estacionEnfocadaId = id;
    if (anteriorId && anteriorId !== id) {
      const anterior = this.estaciones.find((e) => e.id === anteriorId);
      if (anterior) this.ui.actualizarEstacion(anterior, false);
    }
    const estacion = this._estacionEnfocada();
    this.ui.actualizarEstacion(estacion, true);
    this.ui.actualizarEnfoqueMaquina(id);
    this.ui.renderProgresoMaquinaEnfocada(estacion);
  }

  // ── Ingredientes ──────────────────────────────────────────────────────

  /**
   * Clic en un botón "producto adicional" DENTRO de la tarjeta de una
   * estación (ver ui.js actualizarEstacion) — a diferencia de la vieja
   * Estantería global, este botón ya pertenece a una estación concreta, así
   * que actúa directo sobre ella y de paso la enfoca (para que la Máquina
   * y el resto de la UI queden consistentes con "en qué estoy trabajando").
   */
  _alClicIngredienteEstacion(idEstacion, idIngrediente) {
    const estacion = this.estaciones.find((e) => e.id === idEstacion);
    if (!estacion || !estacion.cliente) return;
    if (this.estacionEnfocadaId !== idEstacion) this._enfocarEstacion(idEstacion);

    estacion.capas.push(idIngrediente);
    this.ui.actualizarEstacion(estacion, true);
    this.audio.leche();
  }

  /** Botón de proceso de máquina: siempre actúa sobre la estación enfocada (cada una tiene su propio temporizador). */
  _iniciarProcesoMaquina(id) {
    const estacion = this._estacionEnfocada();
    if (!estacion || !estacion.cliente) {
      this.ui.sacudir(document.querySelector('.zona-maquina-wrap .panel'));
      return;
    }
    if (estacion.maquina.estaOcupada()) return;

    const idEstacion = estacion.id;
    const iniciado = estacion.maquina.iniciar(
      id,
      (fraccion) => { if (this.estacionEnfocadaId === idEstacion) this.ui.actualizarProgresoProceso(id, fraccion); },
      (idTerminado) => {
        estacion.capas.push(idTerminado);
        this.ui.actualizarEstacion(estacion, this.estacionEnfocadaId === idEstacion);
        if (this.estacionEnfocadaId === idEstacion) this.ui.renderProgresoMaquinaEnfocada(estacion);
        this.audio.leche();
      }
    );
    if (!iniciado) return;

    this.ui.actualizarEstacion(estacion, true);
    this.ui.renderProgresoMaquinaEnfocada(estacion);
    this.ui.emitirVapor(id);
    if (id === 'espresso') this.audio.espresso();
    else if (id === 'leche_espumada' || id === 'espuma_de_leche') this.audio.vapor();
  }

  _vaciarIngredientes(idEstacion) {
    const estacion = this.estaciones.find((e) => e.id === idEstacion);
    if (!estacion) return;
    estacion.capas = [];
    this.ui.actualizarEstacion(estacion, estacion.id === this.estacionEnfocadaId);
  }

  // ── Servir ────────────────────────────────────────────────────────────

  _servir(idEstacion) {
    const estacion = this.estaciones.find((e) => e.id === idEstacion);
    if (!estacion || !estacion.cliente) return;
    const cliente = estacion.cliente;
    const segundos = (performance.now() - estacion.inicioPreparacionMs) / 1000;

    if (this._pasosCoinciden(estacion.capas, cliente.receta.pasos)) {
      this._alServirCorrecto(cliente, segundos, idEstacion);
    } else {
      this._alServirIncorrecto(cliente, estacion.capas, idEstacion);
    }
    this._registrarAvanceDeNivel();

    this.customers.quitar(cliente.id);
    estacion.cliente = null;
    estacion.capas = [];
    estacion.maquina.cancelar();
    this.ui.actualizarEstacion(estacion, idEstacion === this.estacionEnfocadaId);
    if (idEstacion === this.estacionEnfocadaId) this.ui.renderProgresoMaquinaEnfocada(estacion);

    this.ui.renderCola(this.customers.cola, this.estaciones, (id) => this._alSeleccionarCliente(id));
    this.ui.renderHUD(this.player);
    this.save.guardar(this.player);
  }

  _pasosCoinciden(preparados, esperados) {
    if (preparados.length !== esperados.length) return false;
    return preparados.every((id, i) => id === esperados[i]);
  }

  _alServirCorrecto(cliente, segundos, idEstacion) {
    const UMBRAL_PERFECTO_S = 10;
    const UMBRAL_RAPIDO_S = 16;

    let puntos = 100;
    let etiqueta = '¡Correcto! +100';
    let esPerfecto = false;

    if (segundos <= UMBRAL_PERFECTO_S) { puntos = 150; etiqueta = '¡Perfecto! +150'; esPerfecto = true; }
    else if (segundos <= UMBRAL_RAPIDO_S) { puntos += 50; etiqueta = '¡Muy rápido! +150'; }

    const clienteContento = cliente.fraccionPaciencia() > 0.5;
    if (clienteContento) { puntos += 20; this.player.clientesFelices++; }

    this.player.ganarPuntos(puntos);
    this.player.ganarDinero(cliente.receta.precio + (esPerfecto ? 1 : 0));
    this.player.cambiarReputacion(clienteContento ? 3 : 1);
    this.player.pedidosAtendidos++;

    this.ui.mostrarFlotante(etiqueta, 'positivo', idEstacion);
    this.ui.mostrarFlotante('+$' + cliente.receta.precio.toFixed(2), 'dinero', idEstacion);
    if (esPerfecto) this.ui.mostrarEstrellas(idEstacion);

    // Maxi festeja cada pedido bien servido, no solo en la pantalla de Home.
    const textoFesteje = esPerfecto ? `¡Perfecto, ${cliente.nombre}!` : `¡${cliente.nombre} contento!`;
    this.ui.mostrarCelebracionMaxi(textoFesteje);

    this.audio.caja();
    if (clienteContento) this.audio.clienteFeliz(); else this.audio.correcto();
  }

  _alServirIncorrecto(cliente, capasPreparadas, idEstacion) {
    const esperados = cliente.receta.pasos;
    const largoMax = Math.max(capasPreparadas.length, esperados.length);
    let ingredientesMal = 0;
    for (let i = 0; i < largoMax; i++) {
      if (capasPreparadas[i] !== esperados[i]) ingredientesMal++;
    }
    const total = 50 + ingredientesMal * 30;

    this.player.ganarPuntos(-total);
    this.player.cambiarReputacion(-(8 + ingredientesMal * 2));

    this.ui.mostrarFlotante(`Bebida incorrecta -${total}`, 'negativo', idEstacion);
    this.audio.clienteEnojado();
  }

  /** Cada cliente resuelto (bien, mal o perdido) cuenta para subir de nivel; se llama una vez por resolución. */
  _registrarAvanceDeNivel() {
    const nivelNuevo = this.player.registrarClienteResuelto();
    if (nivelNuevo) this._alSubirNivel(nivelNuevo);
  }

  _alSubirNivel(nivelNuevo) {
    const tierNueva = tierParaNivel(nivelNuevo);
    const tierAnterior = tierParaNivel(nivelNuevo - 1);
    const recetasNuevas = RECIPES.filter((r) => r.tier <= tierNueva && r.tier > tierAnterior);

    this.ui.mostrarModalNivel(nivelNuevo, recetasNuevas);
    this.audio.subirNivel();
  }

  // ── Clientes perdidos ─────────────────────────────────────────────────

  _alClientePerdido(cliente) {
    this.player.clientesPerdidos++;
    this.player.ganarPuntos(-100);
    this.player.cambiarReputacion(-12);
    this._registrarAvanceDeNivel();

    const estacion = this.estaciones.find((e) => e.cliente && e.cliente.id === cliente.id);
    if (estacion) {
      estacion.cliente = null;
      estacion.capas = [];
      estacion.maquina.cancelar();
      this.ui.actualizarEstacion(estacion, estacion.id === this.estacionEnfocadaId);
      if (estacion.id === this.estacionEnfocadaId) this.ui.renderProgresoMaquinaEnfocada(estacion);
      this.ui.mostrarFlotante(`${cliente.nombre} se fue -100`, 'negativo', estacion.id);
    }

    this.audio.clienteEnojado();
    this.ui.renderHUD(this.player);
  }

  // ── Fin de turno / TOP ────────────────────────────────────────────────

  _finalizarTurno() {
    const resumen = `Puntos: ${this.player.puntosPartidaActual} · Nivel ${this.player.nivel} · $${this.player.dinero.toFixed(2)} · ${this.player.pedidosAtendidos} pedidos atendidos.`;
    this.ui.mostrarModalTurno(resumen);
  }

  async _enviarAlTop() {
    const nombre = this.ui.el.turnoNombre.value.trim();
    const correo = this.ui.el.turnoCorreo.value.trim();
    if (!nombre || !correo) return;

    this.ui.el.turnoMsg.textContent = 'Enviando…';
    const ok = await this.leaderboard.enviar(nombre, correo, this.player.puntosPartidaActual, this.player.nivel);
    if (ok) {
      this.ui.el.turnoMsg.textContent = '¡Listo! Ya apareces en el TOP.';
      setTimeout(() => { this.ui.ocultarModalTurno(); this._mostrarTop(); }, 900);
    } else {
      this.ui.el.turnoMsg.textContent = 'No se pudo enviar ahora mismo. Intenta más tarde.';
    }
  }

  async _mostrarTop() {
    const lista = await this.leaderboard.obtenerTop(10);
    this.ui.mostrarTop(lista);
  }

  // ── Reinicio ──────────────────────────────────────────────────────────

  _reiniciarPartida() {
    if (!window.confirm('¿Reiniciar todo el progreso guardado? Esta acción no se puede deshacer.')) return;
    this.save.reiniciar();
    location.reload();
  }
}

/**
 * El juego NUNCA debe tener scroll, sin importar el tamaño de pantalla desde
 * donde se vea (standalone o incrustado en Coffee App) — pedido explícito:
 * "debe adaptarse, reducir tamaño de los objetos y cosas así". Si el
 * contenido de la pantalla activa no cabe en el alto disponible, se escala
 * completa hacia abajo (nunca se recorta ni se deja con scroll).
 *
 * Nota: se usa setTimeout en vez de requestAnimationFrame para disparar el
 * cálculo — rAF puede no correr de forma confiable dentro de un <iframe>
 * anidado según el motor/entorno (confirmado con pruebas), mientras que
 * setTimeout sí es consistente en todos los casos, embebido o no.
 */
function _pantallaActiva() {
  const home = document.getElementById('pantalla-home');
  const juego = document.getElementById('pantalla-juego');
  if (home && !home.hidden) return home;
  if (juego && !juego.hidden) return juego;
  return null;
}

/**
 * Modo compacto: REDISEÑA en vez de encoger cuando el espacio es chico — el
 * caso de referencia es el panel incrustado en Coffee App, que siempre es
 * bajo de alto aunque el ancho sea de escritorio (no solo el celular). Quita
 * lo decorativo (imagen de la máquina) y agranda los botones vía CSS
 * (.modo-compacto en game.css) en vez de dejarlos ilegibles por el
 * transform:scale() de ajustarEscalaPantalla, que sigue existiendo pero solo
 * como último recurso si el contenido, ya compacto, aun así no cabe.
 */
function ajustarModoCompacto() {
  const altura = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const compacto = window.innerWidth < 700 || altura < 760;
  document.documentElement.classList.toggle('modo-compacto', compacto);
}

function ajustarEscalaPantalla() {
  ajustarModoCompacto();
  const el = _pantallaActiva();
  if (!el) return;
  el.style.width = '100%';
  el.style.transform = 'none';
  // visualViewport.height es más confiable que innerHeight en Safari/iOS —
  // innerHeight puede quedarse con el valor de cuando la barra de
  // direcciones estaba visible incluso después de que se esconde.
  const alturaDisponible = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const alturaContenido = el.scrollHeight;
  if (alturaContenido > alturaDisponible + 4) {
    const escala = Math.max(0.3, alturaDisponible / alturaContenido);
    el.style.transformOrigin = 'top left';
    el.style.width = (100 / escala) + '%';
    el.style.transform = `scale(${escala})`;
    document.documentElement.style.overflow = 'hidden';
  } else {
    document.documentElement.style.overflow = '';
  }
}

/**
 * Pantalla de inicio: el juego se CONSTRUYE al cargar (para poder mostrar el
 * mejor puntaje/nivel guardado en el Home), pero `Game.init()` — que arranca
 * el bucle principal y empieza a hacer llegar clientes — solo se llama al
 * presionar "Jugar". Así el jugador no pierde reputación con clientes que
 * llegan mientras todavía está mirando la pantalla de título.
 */
window.addEventListener('DOMContentLoaded', () => {
  const juego = new Game();
  window.coffeeShopGame = juego;

  document.getElementById('home-record').textContent = juego.player.record;
  document.getElementById('home-nivel').textContent = juego.player.nivel;

  let iniciado = false;
  document.getElementById('btn-jugar').addEventListener('click', () => {
    document.getElementById('pantalla-home').hidden = true;
    document.getElementById('pantalla-juego').hidden = false;
    if (!iniciado) { iniciado = true; juego.init(); }
    // Arranca la radio en el mismo gesto de clic: los navegadores solo
    // permiten audio con sonido si viene de una interacción del usuario,
    // y este clic de "Jugar" es esa interacción.
    juego.radio.reproducir();
    juego.ui.actualizarRadio(true, juego.radio.pistaActual());
    setTimeout(ajustarEscalaPantalla, 60);
  });

  document.getElementById('btn-home-top').addEventListener('click', async () => {
    const lista = await juego.leaderboard.obtenerTop(10);
    juego.ui.mostrarTop(lista);
  });
  document.getElementById('btn-top-cerrar').addEventListener('click', () => juego.ui.ocultarTop());

  let temporizadorEscala = null;
  const reprogramarEscala = () => {
    clearTimeout(temporizadorEscala);
    temporizadorEscala = setTimeout(ajustarEscalaPantalla, 80);
  };
  // childList/subtree (no attributes): así no se dispara a sí mismo cuando
  // ajustarEscalaPantalla() cambia el style de la propia pantalla.
  new MutationObserver(reprogramarEscala).observe(document.getElementById('pantalla-home'), { childList: true, subtree: true });
  new MutationObserver(reprogramarEscala).observe(document.getElementById('pantalla-juego'), { childList: true, subtree: true });
  window.addEventListener('resize', reprogramarEscala);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', reprogramarEscala);
  reprogramarEscala();

  // Red de seguridad: en vez de confiar solo en MutationObserver/resize (que
  // en algunos casos no disparan — ej. Safari/iOS cuando la barra de
  // direcciones se esconde/aparece al hacer scroll, o al entrar al modo
  // pseudo-fullscreen de Coffee App), se revisa cada segundo si el alto
  // disponible cambió y, si hace falta, se recalcula. ajustarEscalaPantalla()
  // es barata (una lectura de scrollHeight) así que este poll no cuesta
  // nada perceptible, pero garantiza que el scroll nunca se queda pegado.
  setInterval(ajustarEscalaPantalla, 1000);
});
