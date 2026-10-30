import { respuestaSimulada, type ClaveSimulada } from "./simulado";

export interface Resultado {
  texto: string;
  entrada: number;
  salida: number;
}

export interface Llamada {
  clave: ClaveSimulada; // qué agente/paso es (lo usa el modo simulado)
  ronda: number;
  sistema: string;
  mensaje: string;
  maxTokens: number;
  signal: AbortSignal;
  onPensando: () => void;
  onDelta: (textoAcumulado: string) => void;
}

export class Detenido extends Error {
  constructor() {
    super("Detenido por el usuario");
  }
}

export function esperar(ms: number, signal: AbortSignal) {
  return new Promise<void>((ok, mal) => {
    if (signal.aborted) return mal(new Detenido());
    const t = setTimeout(ok, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      mal(new Detenido());
    }, { once: true });
  });
}

/** Llamada real: habla con el proxy local, que a su vez habla con Claude. */
export async function llamarReal(l: Llamada): Promise<Resultado> {
  let resp: Response;
  try {
    resp = await fetch("/api/agente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sistema: l.sistema, mensaje: l.mensaje, maxTokens: l.maxTokens }),
      signal: l.signal,
    });
  } catch (e) {
    if (l.signal.aborted) throw new Detenido();
    throw new Error("No se pudo conectar con el proxy local. ¿Está corriendo `npm run dev`?");
  }
  if (!resp.body) throw new Error("El proxy no devolvió datos.");

  const lector = resp.body.getReader();
  const dec = new TextDecoder();
  let bufer = "";
  let texto = "";
  let entrada = 0;
  let salida = 0;
  try {
    while (true) {
      const { value, done } = await lector.read();
      if (done) break;
      bufer += dec.decode(value, { stream: true });
      const partes = bufer.split("\n\n");
      bufer = partes.pop() ?? "";
      for (const parte of partes) {
        const linea = parte.trim();
        if (!linea.startsWith("data:")) continue;
        const ev = JSON.parse(linea.slice(5));
        if (ev.tipo === "pensando") l.onPensando();
        else if (ev.tipo === "delta") {
          texto += ev.texto;
          l.onDelta(texto);
        } else if (ev.tipo === "fin") {
          entrada = ev.uso.entrada;
          salida = ev.uso.salida;
        } else if (ev.tipo === "error") throw new Error(ev.mensaje);
      }
    }
  } catch (e) {
    if (l.signal.aborted) throw new Detenido();
    throw e;
  }
  return { texto, entrada, salida };
}

/** Llamada simulada: sin clave ni costo, con respuestas de ejemplo que se "escriben" poco a poco. */
export async function llamarSimulado(l: Llamada): Promise<Resultado> {
  const completo = respuestaSimulada(l.clave, l.ronda);
  l.onPensando();
  await esperar(1400, l.signal);
  let texto = "";
  // El código se escribe más rápido que el texto normal para que la demo no sea eterna.
  const paso = completo.length > 1500 ? 28 : 6;
  for (let i = 0; i < completo.length; i += paso) {
    texto = completo.slice(0, i + paso);
    l.onDelta(texto);
    await esperar(22, l.signal);
  }
  return {
    texto: completo,
    entrada: Math.round((l.sistema.length + l.mensaje.length) / 3.5),
    salida: Math.round(completo.length / 3.5),
  };
}
