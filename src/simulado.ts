// Respuestas de ejemplo para el modo simulado (sin clave y sin costo).
// Siempre construyen una calculadora, en dos rondas: la primera tiene un fallo a propósito.

export type ClaveSimulada = "jefe" | "programador" | "revisor" | "tester" | "jefeFinal";

const estilos = `
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1220;font-family:system-ui,sans-serif}
  .calc{background:#1b2035;padding:18px;border-radius:18px;box-shadow:0 20px 50px #0008;width:260px}
  .pantalla{background:#0b0e1a;color:#e8ecff;font-size:32px;text-align:right;padding:14px;border-radius:10px;margin-bottom:12px;min-height:40px;overflow:hidden}
  .teclas{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  button{font-size:20px;padding:14px 0;border:0;border-radius:10px;background:#2a3150;color:#e8ecff;cursor:pointer}
  button:hover{filter:brightness(1.2)}
  .op{background:#5b8cff}.igual{background:#3ddc97;color:#08261a}.borrar{background:#ff6b6b}`;

const teclas = `
    <button class="borrar" data-k="C">C</button><button data-k="(">(</button><button data-k=")">)</button><button class="op" data-k="/">÷</button>
    <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button><button class="op" data-k="*">×</button>
    <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button><button class="op" data-k="-">−</button>
    <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button><button class="op" data-k="+">+</button>
    <button data-k="0">0</button><button data-k=".">.</button><button data-k="B">⌫</button><button class="igual" data-k="=">=</button>`;

const CODIGO_V1 = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Calculadora</title>
<style>${estilos}
</style>
</head>
<body>
  <div class="calc">
    <div class="pantalla" id="pantalla">0</div>
    <div class="teclas">${teclas}
    </div>
  </div>
<script>
  let expr = "";
  const pantalla = document.getElementById("pantalla");
  function mostrar(){ pantalla.textContent = expr || "0"; }
  document.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.k;
    if (k === "C") expr = "";
    else if (k === "B") expr = expr.slice(0, -1);
    else if (k === "=") expr = String(eval(expr));
    else expr += k;
    mostrar();
  }));
</script>
</body>
</html>`;

const CODIGO_V2 = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Calculadora</title>
<style>${estilos}
  .pantalla.error{color:#ff6b6b;font-size:22px}
</style>
</head>
<body>
  <div class="calc">
    <div class="pantalla" id="pantalla">0</div>
    <div class="teclas">${teclas}
    </div>
  </div>
<script>
  let expr = "";
  const pantalla = document.getElementById("pantalla");
  function mostrar(texto, esError){
    pantalla.textContent = texto ?? (expr || "0");
    pantalla.classList.toggle("error", !!esError);
  }
  // Calcula sin eval: solo acepta números, operadores y paréntesis.
  function calcular(e){
    if (!/^[0-9+\\-*/().\\s]+$/.test(e)) throw new Error("Expresión no válida");
    const r = Function('"use strict";return (' + e + ')')();
    if (!Number.isFinite(r)) throw new Error("No se puede dividir entre 0");
    return Math.round(r * 1e10) / 1e10;
  }
  function pulsar(k){
    try {
      if (k === "C") expr = "";
      else if (k === "B") expr = expr.slice(0, -1);
      else if (k === "=") { if (!expr) return; expr = String(calcular(expr)); }
      else expr += k;
      mostrar();
    } catch (err) {
      mostrar(err.message, true);
      expr = "";
    }
  }
  document.querySelectorAll("button").forEach(b => b.addEventListener("click", () => pulsar(b.dataset.k)));
  // Soporte de teclado
  document.addEventListener("keydown", ev => {
    const mapa = { Enter: "=", Backspace: "B", Escape: "C" };
    const k = mapa[ev.key] || ev.key;
    if ("0123456789+-*/().".includes(k) || ["=", "B", "C"].includes(k)) pulsar(k);
  });
</script>
</body>
</html>`;

const R: Record<string, string> = {
  jefe_1: `(Modo simulado: estas son respuestas de ejemplo, sin usar la API.)

Plan para el Programador:
• Un solo archivo HTML autocontenido con una calculadora.
• Pantalla grande que muestre la operación y el resultado.
• Botones: números 0-9, punto decimal, + − × ÷, paréntesis, borrar (C) y retroceso (⌫).
• Diseño oscuro, botones grandes y colores por tipo de tecla.
• Manejar errores (por ejemplo, dividir entre 0) sin romper la página.
• Que funcione también con el teclado.`,
  programador_1: `Hice la calculadora con pantalla, todas las teclas y diseño oscuro.

\`\`\`html
${CODIGO_V1}
\`\`\``,
  revisor_1: `Revisé el código:
1. Usa eval() directamente: es inseguro y falla con expresiones mal escritas (por ejemplo "5+*2" lanza un error y la página se queda rota).
2. Dividir entre 0 muestra "Infinity" en vez de un mensaje claro.
3. Falta el soporte de teclado que pedía el plan.
4. El diseño está bien y las teclas son claras.

VEREDICTO: CAMBIOS`,
  tester_1: `Casos de prueba:
✅ 2 + 3 = 5
✅ 7 × 6 = 42
❌ 5 ÷ 0 → muestra "Infinity"
❌ "5+*2" → error sin capturar en la consola
❌ Pulsar Enter en el teclado no hace nada
Informe automático: la página carga sin errores.

RESULTADO: FALLA`,
  programador_2: `Corregí todo: ya no uso eval directo, valido la expresión, muestro "No se puede dividir entre 0" y añadí soporte de teclado (Enter, Escape y Retroceso).

\`\`\`html
${CODIGO_V2}
\`\`\``,
  revisor_2: `Revisé la nueva versión:
1. Los errores ahora se capturan y se muestran en pantalla. Bien.
2. La validación con expresión regular evita código extraño.
3. El teclado funciona como pide el plan.

VEREDICTO: APROBADO`,
  tester_2: `Casos de prueba:
✅ 2 + 3 = 5
✅ 0.1 + 0.2 = 0.3 (redondeado)
✅ 5 ÷ 0 → "No se puede dividir entre 0"
✅ "5+*2" → mensaje de error, la página sigue funcionando
✅ Enter calcula y Escape borra
Informe automático: la página carga sin errores.

RESULTADO: PASA`,
  jefeFinal_1: `¡Listo! El equipo construyó una calculadora en un solo archivo HTML. Puedes usarla con el ratón o con el teclado (Enter para calcular, Escape para borrar). En la segunda ronda corregimos la división entre cero y los errores con operaciones mal escritas. Esto fue una demostración del modo simulado: pon tu clave en .env para que el equipo programe lo que le pidas de verdad.`,
};

export function respuestaSimulada(clave: ClaveSimulada, ronda: number): string {
  const r = Math.min(ronda, clave === "jefe" || clave === "jefeFinal" ? 1 : 2);
  return R[`${clave}_${r}`] ?? R[`${clave}_1`] ?? "(sin respuesta de ejemplo)";
}
