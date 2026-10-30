// Proxy local: el navegador habla con este servidor y este servidor habla con Claude.
// La clave se lee de .env y nunca se envía al navegador.
import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const PUERTO = Number(process.env.PUERTO_PROXY || 8787);
const MODELO = process.env.MODELO || "claude-opus-5-5";
const ESFUERZO = process.env.ESFUERZO || "medium"; // low | medium | high | xhigh | max
const tieneClave = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

const client = tieneClave ? new Anthropic() : null;
const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/api/estado", (_req, res) => {
  res.json({ tieneClave, modelo: MODELO });
});

// Recibe { sistema, mensaje, maxTokens } y responde con eventos SSE:
// pensando | delta (texto) | fin (uso de tokens) | error
app.post("/api/agente", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const enviar = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  if (!client) {
    enviar({ tipo: "error", mensaje: "No hay clave en .env. Usa el modo simulado o agrega ANTHROPIC_API_KEY." });
    return res.end();
  }

  const { sistema, mensaje, maxTokens = 32000 } = req.body ?? {};
  if (typeof sistema !== "string" || typeof mensaje !== "string") {
    enviar({ tipo: "error", mensaje: "Petición inválida." });
    return res.end();
  }

  const crearStream = (conFallback) =>
    client.beta.messages.stream({
      model: MODELO,
      max_tokens: Math.min(Number(maxTokens) || 32000, 64000),
      system: sistema,
      output_config: { effort: ESFUERZO },
      messages: [{ role: "user", content: mensaje }],
      // Si el modelo rechaza la petición por seguridad, el servidor reintenta en otro modelo.
      ...(conFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
    });

  let stream = null;
  res.on("close", () => {
    if (!res.writableEnded) stream?.abort();
  });

  const ejecutar = async (conFallback) => {
    stream = crearStream(conFallback);
    let avisoPensando = false;
    for await (const ev of stream) {
      if (ev.type === "content_block_start" && ev.content_block.type === "thinking" && !avisoPensando) {
        avisoPensando = true;
        enviar({ tipo: "pensando" });
      } else if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
        enviar({ tipo: "delta", texto: ev.delta.text });
      }
    }
    return stream.finalMessage();
  };

  try {
    let final;
    try {
      final = await ejecutar(true);
    } catch (e) {
      // Si la cuenta no admite el parámetro de respaldo, se repite sin él.
      if (e instanceof Anthropic.BadRequestError && /fallback/i.test(e.message)) {
        final = await ejecutar(false);
      } else {
        throw e;
      }
    }
    if (final.stop_reason === "refusal") {
      enviar({ tipo: "error", mensaje: "El modelo se negó a responder esta petición." });
    }
    enviar({
      tipo: "fin",
      uso: {
        entrada: (final.usage.input_tokens || 0) + (final.usage.cache_read_input_tokens || 0) + (final.usage.cache_creation_input_tokens || 0),
        salida: final.usage.output_tokens || 0,
      },
      modelo: final.model,
      corte: final.stop_reason === "max_tokens",
    });
  } catch (e) {
    if (res.writableEnded || res.destroyed) return;
    let mensajeError = "Error al hablar con Claude.";
    if (e instanceof Anthropic.AuthenticationError) mensajeError = "La clave de la API no es válida. Revisa tu archivo .env.";
    else if (e instanceof Anthropic.PermissionDeniedError) mensajeError = "Tu clave no tiene permiso para este modelo.";
    else if (e instanceof Anthropic.NotFoundError) mensajeError = `El modelo "${MODELO}" no existe o no está disponible.`;
    else if (e instanceof Anthropic.RateLimitError) mensajeError = "Demasiadas peticiones o sin crédito. Espera un momento o revisa tu saldo.";
    else if (e instanceof Anthropic.APIError) mensajeError = `Error de la API (${e.status ?? "?"}): ${e.message}`;
    else if (e?.name === "APIUserAbortError") return;
    console.error("[proxy]", e);
    enviar({ tipo: "error", mensaje: mensajeError });
  }
  res.end();
});

app.listen(PUERTO, "127.0.0.1", () => {
  console.log(`\n  Proxy de la oficina listo en http://127.0.0.1:${PUERTO}`);
  console.log(tieneClave ? `  Clave encontrada. Modelo: ${MODELO}` : "  Sin clave en .env: solo funcionará el modo simulado.");
});
