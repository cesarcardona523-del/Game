<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:12100E,100:B5652F&height=180&section=header&text=Maxi%20Barista&fontSize=42&fontColor=fff&fontAlignY=38&desc=Simulador%20de%20Barista%20%7C%20Juego%20(Beta)&descAlignY=58&descColor=f4ede3"/>

</div>

<p align="center">
  <a href="https://cesarcardona-orcin-iota.vercel.app/coffee-app/#/juego">
    <img src="https://img.shields.io/badge/Sitio-En%20vivo-6F4E37?style=flat&logo=vercel&logoColor=white"/>
  </a>
  &nbsp;
  <a href="https://github.com/cesarcardona523-del/Game">
    <img src="https://img.shields.io/badge/GitHub-Repositorio-181717?style=flat&logo=github&logoColor=white"/>
  </a>
  &nbsp;
  <a href="mailto:cesarcardona523@gmail.com">
    <img src="https://img.shields.io/badge/Email-Escribir-1A56E8?style=flat&logo=gmail&logoColor=white"/>
  </a>
</p>

---

> **Repo de trabajo, separado de la página web.** Este repositorio nació
> como copia independiente de `paginaweb/CoffeeShop/` (extraída el
> 2026-07-29) para iterar el juego sin tocar el sitio en vivo.
>
> **Actualizado 2026-08-17:** Coffee App fue reconstruida como SPA
> React/Vite en el repo hermano `CoffeeAPP`. La copia "en vivo" del juego
> ya no está en `paginaweb/CoffeeShop/` (esa carpeta se retiró y quedó
> respaldada en `paginaweb/Backup/coffee-legacy-2026-08-17/CoffeeShop/`) —
> ahora vive en `CoffeeAPP/public/game/`, y se publica dentro de
> `paginaweb/coffee-app/game/` vía `npm run deploy:web` (ver
> `CoffeeAPP/DEPLOYMENT.md`). Cuando el juego esté listo acá, hay que
> copiar los archivos actualizados a `CoffeeAPP/public/game/` (y correr de
> nuevo la migración/Edge Function de Supabase si cambiaron) y luego
> publicar desde ese repo. Los repos NO se sincronizan solos.

## ☕ Sobre este proyecto

Simulador de barista en HTML5 + CSS3 + JavaScript ES6 puro. Sin frameworks,
sin build step, sin dependencias externas — abre `index.html` directamente
en el navegador y funciona. Dentro de Coffee App vive incrustado como
pestaña "Juego" vía `<iframe>` (ver nota arriba).

```text
🎮  3 estaciones en paralelo    → atiende varios pedidos a la vez, sin colas
☕  16 recetas, 4 tiers          → precio calibrado por esfuerzo de máquina
👥  Clientes con paciencia       → propina extra si sirves rápido y bien
🔊  Audio 100% sintetizado       → Web Audio API, cero archivos, cero licencias
🏆  TOP global vía Supabase      → puntaje + nivel, envío opcional de correo
🧪  62 tests (Vitest + jsdom)    → lógica de puntaje/economía/máquina cubierta
```

---

## 🚀 Cómo jugar

1. Clientes llegan a la fila (Zona 1) y hacen un pedido. Haz clic en una
   tarjeta para asignarlo a una **estación libre** (Zona 4) — tienes
   **3 estaciones en paralelo**, así que puedes atender varios pedidos a
   la vez sin esperar a que termine el anterior.
2. Prepara los ingredientes en el **orden exacto** que pide la receta:
   - Los de la **Estantería** (Zona 3) se agregan al instante.
   - Los de la **Máquina de Espresso** (Zona 2, *opcional* — solo la
     necesitan espresso/agua/leche caliente-fría-espumada) tardan unos
     segundos. La máquina actúa sobre la **estación enfocada** (la última
     que tocaste) y cada estación tiene su propio temporizador — puedes
     dejar un espresso brewing en la Estación 1 y seguir trabajando en la
     Estación 2 mientras tanto.
3. Cada ingrediente agregado aparece como una capa en la taza de esa estación.
4. Haz clic en **Servir** en la tarjeta de la estación. Si el orden y los
   ingredientes coinciden con la receta, ganas dinero, experiencia y
   reputación. Si te equivocas, o si el cliente se queda sin paciencia y se
   va, pierdes puntos y reputación.
5. Sube de nivel para desbloquear recetas más difíciles.
6. Cuando quieras, dale a **🏁 Finalizar turno** para enviar tu puntaje al
   TOP global (nombre + correo, opcional — puedes omitirlo).

---

## 🛠️ Stack Técnico

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

Sin framework, sin bundler, sin paso de build — HTML/CSS/JS puro servido
tal cual, con `class` de ES6 normal (solo se evita `import`/`export`, ver
abajo).

**Testing**

![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![jsdom](https://img.shields.io/badge/jsdom-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**Backend (compartido con el resto del sitio)**

![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

---

## 📁 Arquitectura y Organización

```
Game/
├── index.html          Estructura de las 4 zonas + sprite SVG de íconos
├── css/
│   ├── style.css        Reset, paleta, layout general, HUD, modales
│   ├── game.css          Estilos de cada zona (clientes, máquina, estaciones)
│   └── animations.css    Todos los @keyframes
├── js/
│   ├── recipes.js        Datos: INGREDIENTS + RECIPES (única fuente de verdad)
│   ├── scoring.js         Fórmulas puras de puntaje/reputación (sin DOM, testeadas)
│   ├── audio.js            AudioEngine — efectos sintetizados (Web Audio API)
│   ├── radio.js              RadioEngine — música de fondo (ver sección Radio)
│   ├── leaderboard.js         Leaderboard — TOP global vía Supabase REST
│   ├── player.js                Player — nivel/xp/dinero/reputación/estadísticas
│   ├── save.js                    SaveManager — localStorage
│   ├── inventory.js                 Inventory — qué ingredientes están desbloqueados
│   ├── machine.js                     EspressoMachine — 1 proceso a la vez POR ESTACIÓN
│   ├── customers.js                     CustomerManager — spawn, paciencia, dificultad
│   ├── ui.js                               UIController — único módulo que toca el DOM
│   │                                        (usa ElementPool interno para reciclar los
│   │                                        <span> de VFX en vez de crear/destruir)
│   └── game.js                               Game — orquestador, estaciones, reglas
├── assets/
│   └── audio/musica/       README con instrucciones para agregar radio real
├── docs/qa/                Plan de QA (clasificación por sistema, casos de borde)
└── tests/                  Suite Vitest — ver sección "Tests" abajo
```

**Solo en este repo de trabajo, NO se copian a `CoffeeAPP/public/game/`:**
`package.json`, `package-lock.json`, `vitest.config.js`, `tests/`, `docs/`,
`.gitignore`, `skills-lock.json`, `.claude/` — son herramientas de desarrollo
(tests, skills de Claude Code), no parte del juego que se sirve al jugador.

**Por qué scripts clásicos y no ES6 modules:** los navegadores bloquean
`import`/`export` bajo el protocolo `file://` por CORS. Como el requisito es
"debe funcionar simplemente abriendo el archivo HTML", todos los módulos se
cargan como `<script>` clásicos en orden de dependencia y usan `class` de
ES6 normalmente — solo se evita la sintaxis `import`/`export`.

**Estaciones en paralelo (`game.js`):** en vez de una sola taza/cliente
activo, `Game.estaciones` es un arreglo de 3 puestos de trabajo, cada uno
con su **propia instancia de `EspressoMachine`**. Eso es lo que permite que
dos espressos se extraigan al mismo tiempo en estaciones distintas — nada
está bloqueado globalmente, cada estación es independiente. Los botones de
la Zona 2 actúan sobre `estacionEnfocadaId` (la última estación en la que
hiciste clic); las demás estaciones siguen su proceso en segundo plano y lo
muestran con un badge ("⏳ Preparando Espresso…") en su propia tarjeta.

**Por qué no hay archivos de audio de efectos:** `audio.js` sintetiza cada
efecto (máquina, vapor, caja registradora, clientes, campanilla) con
osciladores y ruido filtrado de la Web Audio API en tiempo real. Cero
dependencias, cero licencias que revisar, funciona offline.

**Por qué no hay imágenes/íconos como archivos:** todos los íconos (16
ingredientes + máquina) son un sprite `<svg><symbol>` inline en
`index.html`, referenciado con `<use>`.

## 📻 Radio de la cafetería (`radio.js`)

Botón 📻 en el header. Por defecto reproduce un **loop ambiental lo-fi
generado en vivo** (acordes suaves + un leve "hiss" de vinilo, Web Audio
API) — cero archivos, cero licencias. Si agregas tus propios MP3 royalty-free
en `assets/audio/musica/` (ver el README de esa carpeta), la radio los
detecta solos y reproduce una playlist real en su lugar, sin tocar código.
No pude descargar música de terceros por ti — mismo motivo que las fotos de
los ingredientes: no puedo verificar la licencia de cada pista.

## 🏆 TOP global (`leaderboard.js` + `supabase/coffee_shop_puntajes.sql`)

Al finalizar un turno, el jugador puede enviar nombre + correo + puntaje al
TOP. Usa el mismo proyecto Supabase que el resto del sitio, llamando a la
REST API directo con `fetch()` (sin el SDK `supabase-js`, para que el juego
siga siendo autocontenido). **Requiere correr la migración
`supabase/coffee_shop_puntajes.sql` una vez** en el SQL Editor de Supabase
— hasta entonces, enviar/ver el TOP falla de forma controlada (mensaje
"Intenta más tarde") y el resto del juego sigue funcionando normal.

El INSERT es público (cualquiera puede enviar su puntaje, igual que el
formulario de suscripción del Comparador de Precios); la LECTURA del TOP
pasa por una función `SECURITY DEFINER` que solo expone nombre/puntos/nivel
— el correo nunca es legible desde el cliente, ni siquiera indirectamente.

## 🎮 Incrustado en Coffee App

Coffee App tiene una pestaña "☕ Juego" que muestra este juego dentro de un
`<iframe>` (carga perezosa: el `src` solo se asigna la primera vez que se
abre esa pestaña). El botón "⛶ Pantalla completa" usa la Fullscreen API
sobre el contenedor del iframe — el juego se ve a tamaño normal por
defecto, y solo se expande si el usuario lo pide.

## 🎯 Reglas de puntuación implementadas

| Evento | Puntos |
|---|---|
| Bebida correcta | +100 |
| Bebida correcta y servida en ≤10s | +150 (reemplaza el +100, "¡Perfecto!") |
| Bebida correcta y servida en ≤16s (sin llegar a "perfecto") | +50 extra |
| Cliente con >50% de paciencia al servir | +20 ("cliente feliz") |
| Bebida incorrecta | −50 |
| Cada ingrediente/posición que no coincide con la receta | −30 adicional |
| Cliente se va sin ser atendido | −100 |

El dinero se gana por el precio de cada receta (`recipes.js`), calibrado
por esfuerzo real de máquina (no por "menú de café real"). Subir de nivel
desbloquea recetas de mayor `tier` (1 → 2 → 3 → 4, según la dificultad
pedida).

## 🧪 Tests

`recipes.js`, `scoring.js`, `player.js`, `machine.js`, `customers.js`,
`save.js` e `inventory.js` tienen suite de tests con
[Vitest](https://vitest.dev) + jsdom (62 tests). Estos 7 archivos cargan
como `<script>` clásico en el navegador (sin cambios), pero además exponen
un `module.exports` guardado (`if (typeof module !== 'undefined') ...`) solo
para que los tests puedan importarlos en Node — no afecta la carga real del
juego.

```bash
npm install   # una vez
npm test      # corre toda la suite
```

`game.js` y `ui.js` no tienen tests unitarios propios — están acoplados al
DOM/otros motores (audio, UI) a propósito, y se verifican jugando (ver
`docs/qa/qa-plan-maxi-barista-2026-07-29.md` para el detalle de qué se
prueba manual vs. automático, y por qué).

## 🚢 Publicar en la página web

**Desde 2026-08-17 el destino cambió.** La Coffee App se reconstruyó como
SPA React/Vite en el repo hermano `CoffeeAPP` (fuente de verdad de todo lo
que NO es el juego); `paginaweb/CoffeeShop/` quedó obsoleto y se respaldó en
`paginaweb/Backup/coffee-legacy-2026-08-17/`. Este repo (`Game`) **no se
sincroniza solo** con `CoffeeAPP/public/game/`.

```text
Game/ (este repo)
        ↓  copiar archivos del juego
CoffeeAPP/public/game/
        ↓  npm run dev — probar en /juego
        ↓  npm run deploy:web
paginaweb/coffee-app/game/ (sincronizado)
        ↓  verificar en el navegador
        ↓  revisar git diff en paginaweb
Commit + push manual en paginaweb (Vercel redespliega)
```

1. Copiar los archivos del juego (NO la lista de "solo en este repo" de
   arriba) a `CoffeeAPP/public/game/`.
2. Si se tocó `leaderboard.js` o algo de Supabase, correr la migración/Edge
   Function correspondiente de nuevo.
3. Probar en `CoffeeAPP` con `npm run dev` (ruta `/juego`) antes de publicar.
4. `npm run deploy:web` **dentro de `CoffeeAPP`** — hace el build con el
   `base` correcto y sincroniza `paginaweb/coffee-app/` (nunca toca
   `paginaweb/Backup/`). No hace commit ni push por sí solo.
5. Verificar `paginaweb/coffee-app/` en el navegador, revisar el `git diff`
   en `paginaweb`, y recién ahí `git add` + `commit` + `push` **dentro del
   repo `paginaweb`** (Vercel redespliega automáticamente) — esto afecta el
   sitio en vivo, se confirma explícitamente cada vez, no es un paso
   automático.

Detalle completo del flujo y del backup: `CoffeeAPP/DEPLOYMENT.md`.

## 🔮 Estado actual vs. futuras versiones

Implementado y jugable hoy: las 16 bebidas de la tabla de referencia, 3
estaciones de preparación en paralelo, máquina de espresso opcional con
procesos cronometrados y animados por estación, clientes con paciencia e IA
de pedidos por dificultad, sistema de puntos/dinero/xp/nivel, sonido
sintetizado, radio de fondo (generativa + soporte para playlist real),
TOP global vía Supabase, incrustado en Coffee App con pantalla completa
opcional, guardado automático en `localStorage`.

Lo que el enunciado pide **preparar la arquitectura** para, sin implementar
todavía:

- **Más de 50 recetas** → agregar objetos a `RECIPES` en `recipes.js`.
- **Modo historia / distintas cafeterías** → `Game` ya está separado de
  `UIController`; una nueva "escena" solo necesitaría otro `index.html` que
  reutilice los mismos módulos `js/`.
- **Desafíos diarios / eventos aleatorios (hora pico, VIP, inspección)** →
  `CustomerManager._generarCliente()` es el único punto que decide qué
  cliente aparece; ahí se conectaría un modificador de evento.
- **Logros y medallas** → `Player` ya centraliza todas las estadísticas
  (`clientesFelices`, `pedidosAtendidos`, `record`...); falta solo una
  clase `Achievements` que las observe.
- **Tienda (máquinas, tazas, decoración)** → `Player.desbloqueos` e
  `Inventory.desbloquear()` ya existen como ganchos vacíos.
- **Más de 3 estaciones / ayudantes-baristas** → `NUM_ESTACIONES` en
  `game.js` es una sola constante; subirla ya agrega más puestos en
  paralelo automáticamente (la UI y la lógica ya son genéricas por N).
- **Gestión de inventario con reposición** → `Inventory` es la clase
  designada para eso; hoy todo está desbloqueado/ilimitado a propósito.
- **Estadísticas detalladas** → todos los eventos ya pasan por `Player`,
  solo falta una vista que los liste con más detalle.
- **Libro de recetas / modo aprendizaje** → `RECIPES` ya trae `pasos`
  ordenados y `INGREDIENTS` ya trae nombres — es contenido, no arquitectura.
- **Español/inglés** → todos los textos visibles están centralizados en
  `ui.js` y `recipes.js`, así que agregar un diccionario bilingüe es mecánico.
- **Responsive** → mejorado: en modo compacto (`<700px` de ancho) las 3
  estaciones son un carrusel horizontal (una tarjeta a la vez, como la fila
  de clientes) en vez de apiladas, y los botones del HUD tienen mínimo
  táctil de 44px. En un celular común (375×812) el auto-escalado de
  pantalla bajó de 0.67 a 0.87 — sigue sin llegar a escala 1.0 exacta
  porque el HUD (`flex-wrap`) todavía envuelve a varias líneas en ese
  ancho; reorganizar qué se muestra ahí en compacto es el siguiente paso
  pendiente.

---

## 📬 Contacto

<p align="center">
  <a href="https://linkedin.com/in/cacm523">
    <img src="https://img.shields.io/badge/LinkedIn-César%20Cardona-0A66C2?style=for-the-badge&logo=linkedin"/>
  </a>
  &nbsp;
  <a href="mailto:cesarcardona523@gmail.com">
    <img src="https://img.shields.io/badge/Email-cesarcardona523%40gmail.com-1A56E8?style=for-the-badge&logo=gmail&logoColor=white"/>
  </a>
  &nbsp;
  <a href="https://cesarcardona-orcin-iota.vercel.app/coffee-app/#/juego">
    <img src="https://img.shields.io/badge/Maxi%20Barista-Jugar-6F4E37?style=for-the-badge&logo=vercel&logoColor=white"/>
  </a>
</p>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:B5652F,100:12100E&height=100&section=footer"/>
</div>
