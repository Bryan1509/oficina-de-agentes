# 🏢 Oficina de agentes

Una oficina animada donde un equipo de agentes de IA (con Claude) programa lo que tú les pidas.

| Agente | Rol | Qué hace |
|---|---|---|
| **Ana** | Jefa de proyecto | Lee tu petición, hace un plan y reparte el trabajo |
| **Leo** | Programador | Escribe el código (y lo corrige si se lo piden) |
| **Sofi** | Revisora | Revisa el código y pide cambios si hace falta |
| **Max** | Tester | Abre la página en un entorno aislado, busca errores y valida que funcione |

El ciclo es **Jefa → Programador → Revisora → Tester**. Si la Revisora o el Tester encuentran problemas, la Jefa le devuelve el trabajo al Programador para otra ronda, hasta que todo esté aprobado o se llegue al máximo de rondas que elijas. Al final verás el código, una **vista previa** (si es una página web) y un resumen.

En la oficina verás a cada agente en su escritorio **pensando**, **escribiendo** y **caminando** hacia el escritorio de otro cuando le pasa el trabajo, con burbujas que muestran sus mensajes reales.

---

## 1. Instalar lo necesario (una sola vez)

1. Instala **Node.js** (versión LTS) desde <https://nodejs.org> o, en Windows, con:
   ```bash
   winget install OpenJS.NodeJS.LTS
   ```
   Cierra y vuelve a abrir la terminal después de instalarlo.
2. Abre una terminal **dentro de esta carpeta** (`oficina-de-agentes`) y ejecuta:
   ```bash
   npm install
   ```

## 2. Probar sin clave (modo simulado, gratis)

```bash
npm run dev
```

Abre <http://localhost:5173> en tu navegador y pulsa **▶ Poner a trabajar**. Sin clave, la app funciona en **modo simulado**: el equipo construye una calculadora de ejemplo en dos rondas (en la primera la Revisora y el Tester encuentran fallos a propósito) para que veas toda la animación y el flujo. No cuesta nada.

Para cerrar la app, vuelve a la terminal y pulsa `Ctrl + C`.

## 3. Activar el modo real (con Claude)

> ⚠️ El modo real usa la API de Claude, que **cobra por uso**. La app muestra arriba un contador aproximado de tokens y costo, y tienes el botón **⏹ Detener equipo** para pararlos cuando quieras. Una tarea típica (una página sencilla, 1–3 rondas) suele costar unos centavos de dólar; tareas grandes cuestan más.

### a) Crear tu clave de API
1. Entra en <https://console.anthropic.com> e inicia sesión (o crea una cuenta).
2. En **Billing / Facturación**, agrega un método de pago o compra créditos.
3. Ve a **API Keys** → **Create Key**, ponle un nombre (por ejemplo "oficina") y copia la clave (empieza por `sk-ant-`). Solo se muestra una vez.

### b) Poner la clave en el archivo `.env`
1. En esta carpeta, haz una copia del archivo **`.env.example`** y llámala **`.env`** (exactamente así, con el punto delante).
   - En la terminal: `copy .env.example .env`
2. Abre `.env` con el Bloc de notas y pega tu clave después del `=`:
   ```
   ANTHROPIC_API_KEY=sk-ant-tu-clave-aqui
   ```
3. Guarda el archivo y vuelve a arrancar la app (`Ctrl + C` y luego `npm run dev`).

Ahora el botón **Real** estará disponible. Escribe lo que quieras (por ejemplo *"haz un juego de la serpiente"*) y pulsa **▶ Poner a trabajar**.

### 🔒 Sobre la seguridad de tu clave
- La clave **solo** vive en tu archivo `.env`, en tu computadora.
- El navegador nunca la ve: la app habla con un pequeño servidor local (el "proxy", en `server/index.mjs`), y es ese servidor quien habla con Claude.
- El archivo `.gitignore` impide que `.env` se suba a GitHub. **Nunca** compartas tu `.env` ni pegues la clave en chats.

## Opciones (en `.env`)

| Variable | Para qué sirve | Valor por defecto |
|---|---|---|
| `MODELO` | Qué modelo usan los agentes. `claude-opus-5-5` (el mejor), `claude-sonnet-5-5` (más barato), `claude-haiku-5-5` (el más barato) | `claude-opus-5-5` |
| `ESFUERZO` | Cuánto "piensa" cada agente: `low`, `medium` o `high`. Más esfuerzo = mejor resultado pero más costo | `medium` |
| `PUERTO_PROXY` | Puerto del servidor local | `8787` |

## Consejos
- Las peticiones que mejor funcionan son páginas web en **un solo archivo HTML** (juegos, calculadoras, relojes, formularios, mini‑apps). Así puedes verlas en la pestaña **Vista previa** y descargarlas con el botón **Descargar**.
- También puedes pedir código en otros lenguajes (Python, etc.); lo verás en la pestaña **Código**, pero sin vista previa.
- Usa **Máx. rondas** para limitar cuántas veces se puede corregir el trabajo (y así el costo).
- La vista previa corre en un **iframe aislado** (sandbox): el código generado no puede tocar la app ni tus datos.

## ¿Problemas?
- **"No encuentro el proxy local"**: arranca la app con `npm run dev` (no solo `vite`).
- **"La clave de la API no es válida"**: revisa que `.env` tenga la clave completa, sin espacios ni comillas, y reinicia la app.
- **"Sin crédito" o límite de uso**: revisa tu saldo en console.anthropic.com.
- **`npm` no se reconoce**: cierra y vuelve a abrir la terminal después de instalar Node.js.

## Estructura del proyecto
```
server/index.mjs   Proxy local: lee la clave de .env y habla con Claude
src/equipo.ts      El ciclo de trabajo del equipo (quién hace qué y cuándo)
src/agentes.ts     Personajes, roles e instrucciones de cada agente
src/simulado.ts    Respuestas de ejemplo para el modo simulado
src/codigo.ts      Extrae el código y lo prueba en un iframe aislado
src/Oficina.tsx    La oficina animada
src/Panel.tsx      Registro de mensajes, código y vista previa
```
