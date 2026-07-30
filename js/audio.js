/**
 * audio.js
 * ─────────────────────────────────────────────────────────────────────────
 * Motor de sonido 100% sintetizado con la Web Audio API. Deliberadamente NO
 * usa archivos de audio: así el juego no depende de ningún asset externo,
 * respeta "no usar frameworks / debe abrir con solo el archivo HTML" y evita
 * cualquier problema de licencias de sonido. Cada efecto es una función que
 * arma osciladores/ruido con una envolvente de volumen (ADR simple).
 * ─────────────────────────────────────────────────────────────────────────
 */

class AudioEngine {
  constructor() {
    /** @type {AudioContext|null} Se crea perezosamente al primer sonido (los
     * navegadores exigen un gesto del usuario antes de permitir audio). */
    this.ctx = null;
    this.silenciado = false;
  }

  /** Crea el AudioContext si todavía no existe (debe llamarse tras un click). */
  _asegurarContexto() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /** Silencia/reactiva todos los efectos (botón de audio en el HUD). */
  alternarSilencio() {
    this.silenciado = !this.silenciado;
    return this.silenciado;
  }

  /**
   * Envolvente de volumen genérica: sube a `pico` en `attack` segundos y cae
   * a 0 en `release` segundos. Se usa para que cada sonido no truene al
   * empezar/terminar (clicks de audio digital).
   */
  _envolvente(gainNode, tInicio, pico, attack, release) {
    const g = gainNode.gain;
    g.cancelScheduledValues(tInicio);
    g.setValueAtTime(0.0001, tInicio);
    g.exponentialRampToValueAtTime(pico, tInicio + attack);
    g.exponentialRampToValueAtTime(0.0001, tInicio + attack + release);
  }

  /**
   * Pequeña variación aleatoria de tono (±1.5% por defecto) para que un mismo
   * efecto no suene idéntico nota por nota cada vez que se repite en una
   * sesión larga — no toca las relaciones armónicas entre notas de un mismo
   * efecto (ej. el arpegio de clienteFeliz sigue siendo C5-E5-G5), solo el
   * tono base de esa reproducción particular.
   */
  _variar(frecuencia, rango) {
    const r = rango === undefined ? 0.015 : rango;
    return frecuencia * (1 + (Math.random() * 2 - 1) * r);
  }

  /** Tono simple (usado como base de varios efectos). */
  _tono(frecuencia, tipo, duracion, pico, delay) {
    if (this.silenciado) return;
    const ctx = this._asegurarContexto();
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tipo || 'sine';
    osc.frequency.setValueAtTime(frecuencia, t0);
    osc.connect(gain).connect(ctx.destination);
    this._envolvente(gain, t0, pico || 0.2, 0.01, duracion);
    osc.start(t0);
    osc.stop(t0 + duracion + 0.05);
  }

  /** Ruido blanco filtrado — base del vapor, la máquina de espresso y el hielo. */
  _ruido(duracion, pico, frecuenciaFiltro, delay) {
    if (this.silenciado) return;
    const ctx = this._asegurarContexto();
    const t0 = ctx.currentTime + (delay || 0);
    const muestras = ctx.sampleRate * duracion;
    const buffer = ctx.createBuffer(1, muestras, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < muestras; i++) datos[i] = Math.random() * 2 - 1;

    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.setValueAtTime(frecuenciaFiltro || 1200, t0);
    const gain = ctx.createGain();

    fuente.connect(filtro).connect(gain).connect(ctx.destination);
    this._envolvente(gain, t0, pico || 0.15, 0.05, duracion);
    fuente.start(t0);
    fuente.stop(t0 + duracion + 0.05);
  }

  /** Máquina de espresso: molienda (ruido grave) + extracción (goteo agudo). */
  espresso() {
    this._ruido(0.6, 0.25, 500, 0);
    for (let i = 0; i < 4; i++) this._tono(1800 + Math.random() * 400, 'sine', 0.06, 0.06, 0.6 + i * 0.15);
  }

  /** Vapor / espumado de leche: silbido de ruido agudo sostenido. */
  vapor() {
    this._ruido(0.9, 0.18, 4000, 0);
  }

  /** Servir leche / verter líquido: burbujeo corto. */
  leche() {
    this._tono(this._variar(300), 'sine', 0.25, 0.12, 0);
    this._tono(this._variar(500), 'sine', 0.2, 0.08, 0.08);
  }

  /** Caja registradora al cobrar una bebida correcta. */
  caja() {
    this._tono(this._variar(1400), 'square', 0.08, 0.1, 0);
    this._tono(this._variar(1800), 'square', 0.12, 0.1, 0.09);
  }

  /** Cliente satisfecho: arpegio ascendente. */
  clienteFeliz() {
    [523, 659, 784].forEach((f, i) => this._tono(this._variar(f), 'triangle', 0.18, 0.12, i * 0.09));
  }

  /** Cliente molesto / bebida incorrecta: dos tonos descendentes graves. */
  clienteEnojado() {
    this._tono(this._variar(220), 'sawtooth', 0.25, 0.12, 0);
    this._tono(this._variar(160), 'sawtooth', 0.3, 0.12, 0.18);
  }

  /** Campanilla de la puerta al entrar un cliente nuevo. */
  campana() {
    this._tono(this._variar(1600), 'sine', 0.35, 0.1, 0);
    this._tono(this._variar(2000), 'sine', 0.3, 0.06, 0.05);
  }

  /** Confirmación de preparación correcta (ping corto y limpio). */
  correcto() {
    this._tono(this._variar(900), 'sine', 0.15, 0.14, 0);
  }

  /** Error genérico (ingrediente incorrecto, orden equivocado, etc.). */
  error() {
    this._tono(this._variar(180), 'square', 0.2, 0.1, 0);
  }

  /** Subida de nivel: fanfarria corta de 4 notas. */
  subirNivel() {
    [523, 659, 784, 1046].forEach((f, i) => this._tono(this._variar(f), 'triangle', 0.2, 0.14, i * 0.1));
  }
}
