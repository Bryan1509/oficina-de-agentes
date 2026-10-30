import { useRef } from "react";
import { AGENTES, ETIQUETA_ESTADO, ORDEN, type Estado, type IdAgente } from "./agentes";

export interface VistaAgente {
  estado: Estado;
  burbuja: string;
  destino: IdAgente | null;
}

function posicion(id: IdAgente, destino: IdAgente | null) {
  const yo = AGENTES[id];
  if (!destino) return { x: yo.x, y: yo.y + 13 };
  const otro = AGENTES[destino];
  const lado = yo.x <= otro.x ? -11 : 11;
  return { x: otro.x + lado, y: otro.y + 12 };
}

function textoBurbuja(v: VistaAgente): string {
  const t = v.burbuja;
  if (!t) return "";
  if (v.estado === "escribiendo") {
    const i = t.indexOf("```");
    if (i >= 0) {
      const lineas = t.slice(i).split("\n").length;
      return `⌨️ Escribiendo código… ${lineas} líneas`;
    }
    return t.length > 150 ? "…" + t.slice(-150) : t;
  }
  return t.length > 160 ? t.slice(0, 157) + "…" : t;
}

export function Oficina({ agentes }: { agentes: Record<IdAgente, VistaAgente> }) {
  // Recordamos hacia dónde mira cada personaje para voltearlo al caminar.
  const anterior = useRef<Record<string, { x: number; mira: 1 | -1 }>>({});

  return (
    <section className="oficina" aria-label="Oficina animada">
      <div className="suelo" />
      <div className="pared">
        <div className="ventana" /><div className="ventana" /><div className="ventana" />
        <div className="cartel">OFICINA DE AGENTES</div>
      </div>
      <div className="alfombra" />
      <div className="planta" style={{ left: "47%", top: "15%" }} />
      <div className="planta" style={{ left: "4%", top: "86%" }} />
      <div className="planta" style={{ left: "93%", top: "86%" }} />
      <div className="cafetera" style={{ left: "47%", top: "88%" }} title="Máquina de café" />

      {ORDEN.map((id) => {
        const d = AGENTES[id];
        const v = agentes[id];
        const activo = v.estado === "escribiendo" || v.estado === "pensando";
        return (
          <div key={id} className={"escritorio" + (activo && !v.destino ? " encendido" : "")} style={{ left: d.x + "%", top: d.y + "%", ["--c" as string]: d.color }}>
            <div className="monitor">
              <div className="pantallita">
                <i /><i /><i /><i />
              </div>
            </div>
            <div className="mesa" />
            <div className="silla" />
            <div className="placa">{d.rol}</div>
          </div>
        );
      })}

      {ORDEN.map((id) => {
        const d = AGENTES[id];
        const v = agentes[id];
        const p = posicion(id, v.destino);
        const prev = anterior.current[id];
        let mira: 1 | -1 = prev?.mira ?? 1;
        if (prev && p.x !== prev.x) mira = p.x > prev.x ? 1 : -1;
        anterior.current[id] = { x: p.x, mira };
        const burbuja = textoBurbuja(v);
        return (
          <div
            key={id}
            className={`agente estado-${v.estado}`}
            style={{ left: p.x + "%", top: p.y + "%", zIndex: Math.round(p.y * 10), ["--c" as string]: d.color }}
          >
            {(burbuja || v.estado === "pensando") && (
              <div className={"burbuja" + (v.estado === "pensando" && !burbuja ? " nube" : "")}>
                {v.estado === "pensando" && !burbuja ? <span className="puntos"><i /><i /><i /></span> : burbuja}
              </div>
            )}
            <div className="persona" style={{ transform: `scaleX(${mira})` }}>
              <div className="cabeza" style={{ background: d.piel }}>
                <div className="pelo" style={{ background: d.pelo }} />
                <div className="ojo" />
              </div>
              <div className="torso" style={{ background: d.color }}>
                <div className="brazo" style={{ background: d.color }} />
              </div>
              <div className="piernas"><i /><i /></div>
            </div>
            <div className="nombre">
              <b>{d.nombre}</b>
              <span className={"chip chip-" + v.estado}>{ETIQUETA_ESTADO[v.estado]}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
