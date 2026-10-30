import { useCallback, useEffect, useRef, useState } from "react";
import { AGENTES, ORDEN, type Estado, type IdAgente } from "./agentes";
import { trabajar, type Acciones } from "./equipo";
import { Detenido } from "./llm";
import type { Codigo } from "./codigo";
import { Oficina, type VistaAgente } from "./Oficina";
import { Panel, type Mensaje } from "./Panel";

// Precio aproximado en dólares por millón de tokens (entrada, salida).
const PRECIOS: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

const inicial = (): Record<IdAgente, VistaAgente> =>
  Object.fromEntries(ORDEN.map((id) => [id, { estado: "esperando", burbuja: "", destino: null }])) as Record<IdAgente, VistaAgente>;

const EJEMPLOS = [
  "Haz una calculadora en HTML/JS",
  "Una lista de tareas con filtros y que se guarde en el navegador",
  "Un juego de memoria con cartas de emojis",
  "Un reloj pomodoro bonito con sonido al terminar",
];

type Fase = "lista" | "trabajando" | "terminado" | "detenido" | "error";

export default function App() {
  const [tarea, setTarea] = useState(EJEMPLOS[0]);
  const [servidor, setServidor] = useState<{ tieneClave: boolean; modelo: string } | null>(null);
  const [sinProxy, setSinProxy] = useState(false);
  const [simulado, setSimulado] = useState(true);
  const [maxRondas, setMaxRondas] = useState(3);
  const [agentes, setAgentes] = useState(inicial);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [codigo, setCodigo] = useState<(Codigo & { ronda: number }) | null>(null);
  const [tokens, setTokens] = useState({ entrada: 0, salida: 0 });
  const [ronda, setRonda] = useState(0);
  const [fase, setFase] = useState<Fase>("lista");
  const [aviso, setAviso] = useState("");
  const control = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/estado")
      .then((r) => r.json())
      .then((d) => {
        setServidor(d);
        setSimulado(!d.tieneClave);
      })
      .catch(() => setSinProxy(true));
  }, []);

  const modelo = servidor?.modelo ?? "claude-opus-5-5";
  const [pe, ps] = PRECIOS[modelo] ?? PRECIOS["claude-opus-5-5"];
  const costo = (tokens.entrada * pe + tokens.salida * ps) / 1_000_000;

  const acciones: Acciones = {
    estado: (id: IdAgente, estado: Estado, burbuja?: string) =>
      setAgentes((p) => ({ ...p, [id]: { ...p[id], estado, burbuja: burbuja ?? "" } })),
    caminar: (de, a) => setAgentes((p) => ({ ...p, [de]: { ...p[de], destino: a } })),
    nuevoMensaje: (de, para, titulo) => {
      const id = Math.random().toString(36).slice(2);
      setMensajes((m) => [...m, { id, de, para, titulo, texto: "", terminado: false, hora: new Date() }]);
      return id;
    },
    actualizarMensaje: (idMsg, texto, terminado) =>
      setMensajes((m) => m.map((x) => (x.id === idMsg ? { ...x, texto, terminado: terminado ?? x.terminado } : x))),
    codigo: (c, r) => setCodigo({ ...c, ronda: r }),
    uso: (e, s) => setTokens((t) => ({ entrada: t.entrada + e, salida: t.salida + s })),
    ronda: setRonda,
  };

  const empezar = useCallback(async () => {
    if (!tarea.trim() || fase === "trabajando") return;
    const ctrl = new AbortController();
    control.current = ctrl;
    setAgentes(inicial());
    setMensajes([]);
    setCodigo(null);
    setTokens({ entrada: 0, salida: 0 });
    setRonda(0);
    setAviso("");
    setFase("trabajando");
    try {
      const r = await trabajar({ tarea: tarea.trim(), simulado, maxRondas, signal: ctrl.signal }, acciones);
      setFase("terminado");
      setAviso(r.aprobado ? "✅ El equipo terminó y aprobó el resultado." : "⚠️ Se alcanzó el máximo de rondas sin aprobación completa.");
    } catch (e) {
      if (e instanceof Detenido || ctrl.signal.aborted) {
        setFase("detenido");
        setAviso("⏹ Detuviste al equipo.");
      } else {
        setFase("error");
        setAviso("❌ " + (e instanceof Error ? e.message : String(e)));
      }
      setAgentes((p) => {
        const n = { ...p };
        for (const id of ORDEN) n[id] = { ...n[id], destino: null, estado: n[id].estado === "listo" ? "listo" : "esperando", burbuja: "" };
        return n;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarea, simulado, maxRondas, fase]);

  const detener = () => control.current?.abort();
  const trabajando = fase === "trabajando";

  return (
    <div className="app">
      <header className="cabecera">
        <div className="marca">
          <span className="logo">▦</span>
          <div>
            <h1>Oficina de agentes</h1>
            <p>Un equipo de IA que programa lo que le pidas</p>
          </div>
        </div>
        <div className="contadores">
          <div className="contador">
            <span>Ronda</span>
            <b>{ronda || "–"}<small>/{maxRondas}</small></b>
          </div>
          <div className="contador">
            <span>Tokens</span>
            <b>{(tokens.entrada + tokens.salida).toLocaleString("es")}</b>
            <small>{tokens.entrada.toLocaleString("es")} entrada · {tokens.salida.toLocaleString("es")} salida</small>
          </div>
          <div className="contador">
            <span>Costo aprox.</span>
            <b>${costo.toFixed(costo < 0.1 ? 4 : 2)}</b>
            <small>{simulado ? "simulado: $0 real" : modelo}</small>
          </div>
        </div>
      </header>

      <section className="mando">
        <textarea
          value={tarea}
          onChange={(e) => setTarea(e.target.value)}
          placeholder="¿Qué quieres que programe el equipo? Ej.: haz una calculadora en HTML/JS"
          disabled={trabajando}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) empezar();
          }}
        />
        <div className="mando-lado">
          <div className="opciones">
            <div className="interruptor" role="group" aria-label="Modo">
              <button className={simulado ? "activo" : ""} onClick={() => setSimulado(true)} disabled={trabajando}>Simulado</button>
              <button
                className={!simulado ? "activo" : ""}
                onClick={() => setSimulado(false)}
                disabled={trabajando || !servidor?.tieneClave}
                title={servidor?.tieneClave ? "Usa la API de Claude (tiene costo)" : "Agrega tu clave en .env para activarlo"}
              >
                Real
              </button>
            </div>
            <label className="rondas">
              Máx. rondas
              <select value={maxRondas} onChange={(e) => setMaxRondas(Number(e.target.value))} disabled={trabajando}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          {trabajando ? (
            <button className="boton peligro" onClick={detener}>⏹ Detener equipo</button>
          ) : (
            <button className="boton" onClick={empezar} disabled={!tarea.trim()}>▶ Poner a trabajar</button>
          )}
        </div>
      </section>

      <div className="ejemplos">
        {EJEMPLOS.map((e) => (
          <button key={e} onClick={() => setTarea(e)} disabled={trabajando}>{e}</button>
        ))}
      </div>

      {(sinProxy || (servidor && !servidor.tieneClave) || aviso) && (
        <div className="avisos">
          {sinProxy && <div className="aviso malo">No encuentro el proxy local. Arranca la app con <code>npm run dev</code>. Mientras tanto solo funciona el modo simulado.</div>}
          {servidor && !servidor.tieneClave && <div className="aviso">Sin clave en <code>.env</code>: estás en modo <b>simulado</b> (respuestas de ejemplo, gratis). Lee el README para activar el modo real.</div>}
          {aviso && <div className={"aviso " + (fase === "error" ? "malo" : "bueno")}>{aviso}</div>}
        </div>
      )}

      <main className="cuerpo">
        <Oficina agentes={agentes} />
        <Panel mensajes={mensajes} codigo={codigo} trabajando={trabajando} />
      </main>

      <footer className="pie">
        {ORDEN.map((id) => (
          <span key={id}><i style={{ background: AGENTES[id].color }} /> {AGENTES[id].nombre} · {AGENTES[id].rol}</span>
        ))}
      </footer>
    </div>
  );
}
