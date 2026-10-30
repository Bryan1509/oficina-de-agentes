import { useEffect, useRef, useState } from "react";
import { AGENTES, type IdAgente } from "./agentes";
import { esWeb, type Codigo } from "./codigo";

export interface Mensaje {
  id: string;
  de: IdAgente;
  para: IdAgente | "usuario" | null;
  titulo: string;
  texto: string;
  terminado: boolean;
  hora: Date;
}

type Pestana = "registro" | "codigo" | "vista";

function sinBloques(t: string) {
  return t.replace(/```[\w+-]*[^\n]*\n([\s\S]*?)(```|$)/g, (_m, c: string) => `\n[📄 bloque de código de ${c.split("\n").length} líneas · míralo en la pestaña Código]\n`);
}

export function Panel({ mensajes, codigo, trabajando }: { mensajes: Mensaje[]; codigo: (Codigo & { ronda: number }) | null; trabajando: boolean }) {
  const [pestana, setPestana] = useState<Pestana>("registro");
  const [copiado, setCopiado] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const web = esWeb(codigo);

  useEffect(() => {
    const el = lista.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 220) el.scrollTop = el.scrollHeight;
  }, [mensajes]);

  // Si se reinicia el trabajo y ya no hay código, volvemos al registro.
  useEffect(() => {
    if (!codigo && pestana !== "registro") setPestana("registro");
  }, [codigo, pestana]);

  // Cuando termina el trabajo y hay una página, mostramos la vista previa.
  const antes = useRef(trabajando);
  useEffect(() => {
    if (antes.current && !trabajando && web) setPestana("vista");
    antes.current = trabajando;
  }, [trabajando, web]);

  const copiar = async () => {
    if (!codigo) return;
    await navigator.clipboard.writeText(codigo.contenido);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const descargar = () => {
    if (!codigo) return;
    const ext = web ? "html" : codigo.lenguaje || "txt";
    const url = URL.createObjectURL(new Blob([codigo.contenido], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `resultado.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="panel">
      <nav className="pestanas">
        <button className={pestana === "registro" ? "activa" : ""} onClick={() => setPestana("registro")}>
          Registro <span className="num">{mensajes.length}</span>
        </button>
        <button className={pestana === "codigo" ? "activa" : ""} onClick={() => setPestana("codigo")} disabled={!codigo}>
          Código {codigo && <span className="num">r{codigo.ronda}</span>}
        </button>
        <button className={pestana === "vista" ? "activa" : ""} onClick={() => setPestana("vista")} disabled={!web}>
          Vista previa
        </button>
      </nav>

      {pestana === "registro" && (
        <div className="registro" ref={lista}>
          {!mensajes.length && <p className="vacio">Aquí verás los mensajes reales entre los agentes. Escribe una tarea y pulsa <b>Poner a trabajar</b>.</p>}
          {mensajes.map((m) => {
            const d = AGENTES[m.de];
            const para = m.para === "usuario" ? "Tú" : m.para ? AGENTES[m.para].nombre : "";
            return (
              <article key={m.id} className="msg" style={{ ["--c" as string]: d.color }}>
                <header>
                  <span className="avatar">{d.nombre[0]}</span>
                  <b>{d.nombre}</b>
                  {para && <span className="flecha">→ {para}</span>}
                  <span className="titulo">{m.titulo}</span>
                  <time>{m.hora.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
                </header>
                <div className="texto">
                  {sinBloques(m.texto) || <span className="esperando">pensando…</span>}
                  {!m.terminado && m.texto && <span className="cursor">▍</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pestana === "codigo" && codigo && (
        <div className="codigo">
          <div className="barra">
            <span>{codigo.lenguaje || "texto"} · {codigo.contenido.split("\n").length} líneas · ronda {codigo.ronda}</span>
            <div>
              <button onClick={copiar}>{copiado ? "¡Copiado!" : "Copiar"}</button>
              <button onClick={descargar}>Descargar</button>
            </div>
          </div>
          <pre><code>{codigo.contenido}</code></pre>
        </div>
      )}

      {pestana === "vista" && codigo && web && (
        <div className="vista">
          <div className="barra"><span>Vista previa aislada (sandbox)</span></div>
          {/* sandbox sin allow-same-origin: la página no puede tocar esta app */}
          <iframe title="Vista previa" sandbox="allow-scripts allow-modals allow-forms" srcDoc={codigo.contenido} />
        </div>
      )}
    </aside>
  );
}
