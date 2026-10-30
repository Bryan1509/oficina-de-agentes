export interface Codigo {
  lenguaje: string;
  contenido: string;
}

/** Saca el bloque de código más largo de una respuesta en markdown. */
export function extraerCodigo(texto: string): Codigo | null {
  const bloques: Codigo[] = [];
  const re = /```([\w+-]*)[^\n]*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) bloques.push({ lenguaje: (m[1] || "").toLowerCase(), contenido: m[2].trimEnd() });
  if (!bloques.length) {
    // Respuesta cortada: hay apertura pero no cierre.
    const abierto = /```([\w+-]*)[^\n]*\n([\s\S]*)$/.exec(texto);
    if (abierto) bloques.push({ lenguaje: (abierto[1] || "").toLowerCase(), contenido: abierto[2].trimEnd() });
  }
  if (!bloques.length) return null;
  return bloques.reduce((a, b) => (b.contenido.length >= a.contenido.length ? b : a));
}

export function esWeb(c: Codigo | null): boolean {
  if (!c) return false;
  return c.lenguaje === "html" || /<!doctype html|<html[\s>]|<body[\s>]/i.test(c.contenido);
}

/** Script que se inyecta en la vista de prueba para avisar de errores de consola. */
const ESPIA = `<script>
(function(){
  function enviar(tipo, msg){ try{ parent.postMessage({__oficina:true, tipo:tipo, msg:String(msg).slice(0,300)}, "*"); }catch(e){} }
  window.addEventListener("error", function(e){ enviar("error", e.message + (e.lineno ? " (línea " + e.lineno + ")" : "")); });
  window.addEventListener("unhandledrejection", function(e){ enviar("error", "Promesa rechazada: " + (e.reason && e.reason.message || e.reason)); });
  var ce = console.error; console.error = function(){ enviar("error", Array.prototype.join.call(arguments, " ")); ce.apply(console, arguments); };
  window.addEventListener("load", function(){
    setTimeout(function(){
      enviar("listo", "elementos=" + document.querySelectorAll("*").length + "; botones=" + document.querySelectorAll("button").length + "; texto=" + (document.body ? document.body.innerText.trim().length : 0));
    }, 900);
  });
})();
</script>`;

export function conEspia(html: string): string {
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (h) => h + ESPIA);
  return ESPIA + html;
}

/** Carga la página en un iframe oculto y aislado y devuelve un informe de lo que pasó. */
export function probarEnIframe(html: string, signal: AbortSignal): Promise<string> {
  return new Promise((ok) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;height:600px;visibility:hidden";
    const errores: string[] = [];
    let resumen = "";
    const fin = (motivo: string) => {
      window.removeEventListener("message", oir);
      iframe.remove();
      const partes = [motivo];
      if (resumen) partes.push(`Estructura: ${resumen}`);
      partes.push(errores.length ? `Errores de consola (${errores.length}):\n- ${errores.slice(0, 8).join("\n- ")}` : "Sin errores de consola al cargar.");
      ok(partes.join("\n"));
    };
    const oir = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow || !e.data?.__oficina) return;
      if (e.data.tipo === "error") errores.push(e.data.msg);
      if (e.data.tipo === "listo") {
        resumen = e.data.msg;
        clearTimeout(limite);
        fin("La página cargó correctamente.");
      }
    };
    const limite = setTimeout(() => fin("La página tardó demasiado en cargar (más de 6 s)."), 6000);
    signal.addEventListener("abort", () => { clearTimeout(limite); fin("Prueba cancelada."); }, { once: true });
    window.addEventListener("message", oir);
    iframe.srcdoc = conEspia(html);
    document.body.appendChild(iframe);
  });
}
