// El "cerebro" del equipo: decide quién trabaja, qué recibe y a quién le pasa el trabajo.
import { SISTEMA, type Estado, type IdAgente } from "./agentes";
import { esperar, llamarReal, llamarSimulado, type Llamada } from "./llm";
import type { ClaveSimulada } from "./simulado";
import { esWeb, extraerCodigo, probarEnIframe, type Codigo } from "./codigo";

export interface Acciones {
  estado: (id: IdAgente, estado: Estado, burbuja?: string) => void;
  caminar: (de: IdAgente, a: IdAgente | null) => void; // null = volver a su escritorio
  nuevoMensaje: (de: IdAgente, para: IdAgente | "usuario" | null, titulo: string) => string;
  actualizarMensaje: (idMsg: string, texto: string, terminado?: boolean) => void;
  codigo: (c: Codigo, ronda: number) => void;
  uso: (entrada: number, salida: number) => void;
  ronda: (n: number) => void;
}

export interface Opciones {
  tarea: string;
  simulado: boolean;
  maxRondas: number;
  signal: AbortSignal;
}

const PASEO_MS = 1500;

export async function trabajar(op: Opciones, a: Acciones): Promise<{ aprobado: boolean; codigo: Codigo | null }> {
  const { signal } = op;
  const llamar = op.simulado ? llamarSimulado : llamarReal;

  /** Un agente piensa y escribe; su texto aparece en vivo en su burbuja y en el registro. */
  const hablar = async (
    id: IdAgente,
    clave: ClaveSimulada,
    ronda: number,
    para: IdAgente | "usuario" | null,
    titulo: string,
    mensaje: string,
    maxTokens: number,
  ) => {
    const idMsg = a.nuevoMensaje(id, para, titulo);
    a.estado(id, "pensando");
    const l: Llamada = {
      clave,
      ronda,
      sistema: SISTEMA[clave],
      mensaje,
      maxTokens,
      signal,
      onPensando: () => a.estado(id, "pensando"),
      onDelta: (t) => {
        a.estado(id, "escribiendo", t);
        a.actualizarMensaje(idMsg, t);
      },
    };
    const r = await llamar(l);
    a.actualizarMensaje(idMsg, r.texto, true);
    a.uso(r.entrada, r.salida);
    a.estado(id, "listo", resumir(r.texto));
    return r.texto;
  };

  /** Un agente camina al escritorio de otro, le entrega algo y vuelve. */
  const entregar = async (de: IdAgente, a2: IdAgente, frase: string) => {
    a.estado(de, "caminando", frase);
    a.caminar(de, a2);
    await esperar(PASEO_MS, signal);
    a.estado(de, "esperando", frase);
    await esperar(1100, signal);
    a.caminar(de, null);
    a.estado(de, "caminando");
    await esperar(PASEO_MS, signal);
    a.estado(de, "esperando");
  };

  // 1) La jefa hace el plan
  const plan = await hablar(
    "jefe", "jefe", 1, "programador", "Plan de trabajo",
    `Petición del usuario:\n"""${op.tarea}"""\n\nEscribe el plan para el Programador.`,
    8000,
  );
  await entregar("jefe", "programador", "Leo, aquí tienes el plan 📋");

  let codigo: Codigo | null = null;
  let comentarios = "";
  let aprobado = false;

  for (let ronda = 1; ronda <= op.maxRondas; ronda++) {
    a.ronda(ronda);

    // 2) El programador escribe (o corrige) el código
    const pedido = ronda === 1 || !codigo
      ? `Petición del usuario:\n"""${op.tarea}"""\n\nPlan de la Jefa:\n${plan}\n\nEscribe el código completo.`
      : `Petición del usuario:\n"""${op.tarea}"""\n\nPlan de la Jefa:\n${plan}\n\nTu código actual:\n\`\`\`${codigo.lenguaje}\n${codigo.contenido}\n\`\`\`\n\nComentarios del equipo que debes corregir:\n${comentarios}\n\nEntrega el archivo COMPLETO corregido.`;
    const respProg = await hablar("programador", "programador", ronda, "revisor", `Código · ronda ${ronda}`, pedido, 32000);
    const nuevo = extraerCodigo(respProg);
    if (nuevo) {
      codigo = nuevo;
      a.codigo(nuevo, ronda);
    }
    if (!codigo) {
      comentarios = "No entregaste ningún bloque de código. Entrega el archivo completo dentro de un bloque ```.";
      continue;
    }
    await entregar("programador", "revisor", "Sofi, ¿me revisas esto? 🧐");

    // 3) La revisora revisa
    const bloque = `\`\`\`${codigo.lenguaje}\n${codigo.contenido}\n\`\`\``;
    const revision = await hablar(
      "revisor", "revisor", ronda, "tester", `Revisión · ronda ${ronda}`,
      `Petición del usuario:\n"""${op.tarea}"""\n\nPlan:\n${plan}\n\nCódigo a revisar:\n${bloque}`,
      8000,
    );
    const okRevision = /VEREDICTO:\s*APROBADO/i.test(revision);
    await entregar("revisor", "tester", okRevision ? "Max, aprobado por mí, ¡pruébalo! ✅" : "Max, tiene detalles, pruébalo igual 🔧");

    // 4) El tester prueba (con informe automático si es web)
    let informe = "No es una página web, así que no se pudo ejecutar automáticamente.";
    if (esWeb(codigo)) {
      a.estado("tester", "pensando", "Abriendo la página para probarla…");
      informe = await probarEnIframe(codigo.contenido, signal);
    }
    const prueba = await hablar(
      "tester", "tester", ronda, "jefe", `Pruebas · ronda ${ronda}`,
      `Petición del usuario:\n"""${op.tarea}"""\n\nCódigo:\n${bloque}\n\nInforme automático de ejecución:\n${informe}\n\nNotas de la Revisora:\n${revision}`,
      8000,
    );
    const okPrueba = /RESULTADO:\s*PASA/i.test(prueba);
    await entregar("tester", "jefe", okPrueba ? "Ana, todas las pruebas pasan 🎉" : "Ana, encontré fallos 🐞");

    if (okRevision && okPrueba) {
      aprobado = true;
      break;
    }
    comentarios = `De la Revisora:\n${revision}\n\nDel Tester:\n${prueba}`;
    if (ronda < op.maxRondas) {
      a.estado("jefe", "pensando", "Juntando los comentarios…");
      await esperar(700, signal);
      await entregar("jefe", "programador", `Leo, toca corregir (ronda ${ronda + 1}) 🔁`);
    }
  }

  // 5) Resumen final para el usuario
  await hablar(
    "jefe", "jefeFinal", 1, "usuario", "Resumen final",
    `Petición del usuario:\n"""${op.tarea}"""\n\nPlan:\n${plan}\n\n¿Aprobado por Revisora y Tester?: ${aprobado ? "sí" : "no, se llegó al máximo de rondas"}.\n\nÚltimos comentarios:\n${comentarios || "ninguno"}`,
    4000,
  );
  for (const id of ["programador", "revisor", "tester"] as IdAgente[]) a.estado(id, "listo", aprobado ? "¡Buen trabajo, equipo! 🙌" : "Hicimos lo que pudimos 😅");
  return { aprobado, codigo };
}

/** Texto corto para la burbuja una vez que el agente termina. */
function resumir(t: string): string {
  const sinCodigo = t.replace(/```[\s\S]*?(```|$)/g, "[código]").trim();
  const ultima = sinCodigo.split("\n").filter(Boolean);
  const veredicto = ultima.find((l) => /VEREDICTO|RESULTADO/i.test(l));
  if (veredicto) return veredicto;
  return sinCodigo.length > 120 ? sinCodigo.slice(0, 117) + "…" : sinCodigo;
}
