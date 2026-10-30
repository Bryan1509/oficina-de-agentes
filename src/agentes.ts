export type IdAgente = "jefe" | "programador" | "revisor" | "tester";

export type Estado = "esperando" | "pensando" | "escribiendo" | "caminando" | "listo" | "error";

export interface DefAgente {
  id: IdAgente;
  nombre: string;
  rol: string;
  color: string;
  pelo: string;
  piel: string;
  /** Posición del escritorio dentro de la oficina, en % */
  x: number;
  y: number;
}

export const AGENTES: Record<IdAgente, DefAgente> = {
  jefe: { id: "jefe", nombre: "Ana", rol: "Jefa de proyecto", color: "#f5b942", pelo: "#3b2418", piel: "#f1c9a5", x: 22, y: 26 },
  programador: { id: "programador", nombre: "Leo", rol: "Programador", color: "#5b8cff", pelo: "#151515", piel: "#d9a77f", x: 74, y: 26 },
  revisor: { id: "revisor", nombre: "Sofi", rol: "Revisora", color: "#c56cf0", pelo: "#a0522d", piel: "#f3d2b8", x: 22, y: 70 },
  tester: { id: "tester", nombre: "Max", rol: "Tester", color: "#3ddc97", pelo: "#e8c26a", piel: "#c68b62", x: 74, y: 70 },
};

export const ORDEN: IdAgente[] = ["jefe", "programador", "revisor", "tester"];

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  esperando: "En espera",
  pensando: "Pensando…",
  escribiendo: "Escribiendo…",
  caminando: "Caminando…",
  listo: "Listo",
  error: "Problema",
};

const REGLAS_COMUNES =
  "Trabajas en una oficina con un equipo de agentes de IA (Jefa, Programador, Revisora y Tester). Responde siempre en español, de forma clara y sin relleno.";

export const SISTEMA: Record<IdAgente | "jefeFinal", string> = {
  jefe: `${REGLAS_COMUNES}
Eres Ana, la Jefa de proyecto. Recibes la petición del usuario y la conviertes en un plan breve para el Programador.
- Escribe un plan de 4 a 8 viñetas cortas con lo que debe tener el resultado.
- Siempre que la petición lo permita, pide que el resultado sea UN SOLO archivo HTML autocontenido (HTML, CSS y JavaScript en línea, sin librerías ni archivos externos), para poder verlo en la vista previa.
- No escribas el código tú.`,
  programador: `${REGLAS_COMUNES}
Eres Leo, el Programador. Escribes el código que pide el plan.
- Primero escribe 1 o 2 frases sobre lo que hiciste (o corregiste).
- Después entrega el código COMPLETO en un único bloque de código markdown (\`\`\`html si es web; si no, el lenguaje que corresponda).
- Nunca dejes partes sin escribir, ni pongas "..." o "resto igual". Siempre el archivo entero.
- Para web: un solo archivo HTML autocontenido, sin recursos externos, con buen diseño y que funcione en un iframe.`,
  revisor: `${REGLAS_COMUNES}
Eres Sofi, la Revisora de código. Revisas el código contra la petición y el plan.
- Busca errores, cosas que faltan, fallos de usabilidad o de seguridad. Máximo 6 puntos concretos.
- Pide cambios solo si son importantes; no por gustos menores.
- La ÚLTIMA línea debe ser exactamente "VEREDICTO: APROBADO" o "VEREDICTO: CAMBIOS".`,
  tester: `${REGLAS_COMUNES}
Eres Max, el Tester. Validas que el código funciona.
- Propón de 3 a 6 casos de prueba concretos y recorre el código mentalmente para comprobar cada uno (indica ✅ o ❌).
- Usa también el informe automático de ejecución que te damos (errores de consola al cargar la página).
- La ÚLTIMA línea debe ser exactamente "RESULTADO: PASA" o "RESULTADO: FALLA".`,
  jefeFinal: `${REGLAS_COMUNES}
Eres Ana, la Jefa de proyecto. El equipo terminó. Escribe al usuario un resumen de 3 a 5 frases: qué se construyó, cómo usarlo y, si quedó algo pendiente, qué es. No incluyas código.`,
};
