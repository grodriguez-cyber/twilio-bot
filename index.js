const express = require("express");
const bodyParser = require("body-parser");
const { MessagingResponse } = require("twilio").twiml;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const sessions = {};

// =======================
// CONFIGURACIÓN
// =======================

const categorias = {
  "1": "🕳️ Bache",
  "2": "💡 Alumbrado",
  "3": "💧 Agua potable",
  "4": "🌳 Arbolado",
  "5": "🚧 Obra pública"
};

const detallesPorCategoria = {
  "🕳️ Bache": {
    pregunta: "🕳️ ¿Qué tan urgente es el bache?",
    opciones: {
      "1": "Leve (se puede esquivar)",
      "2": "Media (daña si no lo ves)",
      "3": "Alta (muy peligroso)"
    }
  },
  "💡 Alumbrado": {
    pregunta: "💡 ¿Qué ocurre con el alumbrado?",
    opciones: {
      "1": "No enciende",
      "2": "Está dañado",
      "3": "Permanece encendido de día"
    }
  },
  "💧 Agua potable": {
    pregunta: "💧 ¿Cómo es el problema del agua?",
    opciones: {
      "1": "Goteo constante",
      "2": "Fuga considerable",
      "3": "Sin suministro"
    }
  },
  "🌳 Arbolado": {
    pregunta: "🌳 ¿Qué situación presenta el árbol?",
    opciones: {
      "1": "Rama caída",
      "2": "Bloquea el paso",
      "3": "Riesgo de caer"
    }
  },
  "🚧 Obra pública": {
    pregunta: "🚧 ¿Cuál es el problema?",
    opciones: {
      "1": "Obra abandonada",
      "2": "Material obstruyendo",
      "3": "Daños a vialidad"
    }
  }
};

// =======================
// ENDPOINT
// =======================

app.post("/whatsapp", (req, res) => {
  const from = req.body.From;
  const msg = req.body.Body?.trim();
  const lat = req.body.Latitude;
  const lng = req.body.Longitude;

  if (!sessions[from]) sessions[from] = { step: 0 };
  const user = sessions[from];
  let reply = "";

  // =======================
  // COMANDOS GLOBALES
  // =======================
  const cmd = msg?.toLowerCase();

  if (cmd === "inicio") {
    sessions[from] = { step: 0 };
    reply = "🔄 Proceso reiniciado.\nEscribe cualquier mensaje para comenzar.";
    return send(res, reply);
  }

  if (cmd === "salir") {
    delete sessions[from];
    reply = "👋 Proceso cancelado. Escribe *inicio* para comenzar de nuevo.";
    return send(res, reply);
  }

  // =======================
  // FLUJO PRINCIPAL
  // =======================
  switch (user.step) {

    // STATE 0 — WELCOME
    case 0:
      reply = `👋 Hola, soy el bot de Reporte Ciudadano.

Te haré 3 preguntas:
1️⃣ Tipo de reporte
2️⃣ Ubicación
3️⃣ Detalle

1️⃣ Continuar
2️⃣ Salir`;
      user.step = 1;
      break;

    // STATE 1 — CATEGORY
    case 1:
      if (msg !== "1") {
        reply = "❌ Escribe *1* para continuar o *SALIR*.";
        break;
      }

      reply = `📋 ¿Qué deseas reportar?

1️⃣ Bache
2️⃣ Alumbrado
3️⃣ Agua potable
4️⃣ Arbolado
5️⃣ Obra pública`;
      user.step = 2;
      break;

    // STATE 2 — CATEGORY SELECT
    case 2:
      if (!categorias[msg]) {
        reply = "❌ Selecciona un número del 1 al 5.";
        break;
      }

      user.categoria = categorias[msg];
      reply = "📍 Envía tu ubicación actual usando el botón 📎 → Ubicación.";
      user.step = 3;
      break;

    // STATE 3 — LOCATION
    case 3:
      if (!lat || !lng) {
        reply = "⚠️ Necesito la ubicación GPS. Usa el botón 📍.";
        break;
      }

      user.lat = lat;
      user.lng = lng;

      // 👉 AQUÍ SE ENVIABA NADA ANTES — YA CORREGIDO
      const data = detallesPorCategoria[user.categoria];
      const opciones = Object.entries(data.opciones)
        .map(([k, v]) => `${k}️⃣ ${v}`)
        .join("\n");

      reply = `${data.pregunta}

${opciones}`;
      user.step = 4;
      break;

    // STATE 4 — DETAIL
    case 4:
      const opcionesDetalle = detallesPorCategoria[user.categoria].opciones;
      if (!opcionesDetalle[msg]) {
        reply = "❌ Selecciona una opción válida.";
        break;
      }

      user.detalle = opcionesDetalle[msg];

      reply = `📸 ¿Deseas enviar una foto?

1️⃣ Enviar foto
2️⃣ Omitir`;
      user.step = 5;
      break;

    // STATE 5 — PHOTO
    case 5:
      if (msg === "1") {
        reply = "📷 Envía la foto ahora o escribe *OMITIR*.";
        user.step = 6;
        break;
      }

      if (msg === "2") {
        user.foto = false;

        // 👉 AQUÍ ESTABA EL BLOQUEO — YA CORREGIDO
        reply = `👤 ¿Deseas dejar datos para seguimiento?

1️⃣ Sí
2️⃣ No (anónimo)`;
        user.step = 7;
        break;
      }

      reply = "❌ Responde 1 o 2.";
      break;

    // STATE 6 — WAIT PHOTO
    case 6:
      if (req.body.NumMedia > 0) {
        user.foto = true;
      }
      reply = `👤 ¿Deseas dejar datos para seguimiento?

1️⃣ Sí
2️⃣ No (anónimo)`;
      user.step = 7;
      break;

    // STATE 7 — CONTACT
    case 7:
      user.anonimo = msg === "2";

      reply = `📋 *Resumen del reporte*

📌 Tipo: ${user.categoria}
📍 Ubicación: https://maps.google.com/?q=${user.lat},${user.lng}
📝 Detalle: ${user.detalle}
📷 Foto: ${user.foto ? "Sí" : "No"}

1️⃣ Confirmar
2️⃣ Cancelar`;
      user.step = 8;
      break;

    // STATE 8 — CONFIRM
    case 8:
      if (msg === "1") {
        const folio = `XAL-${Date.now()}`;
        reply = `✅ Reporte enviado correctamente.

🆔 Folio: ${folio}

Gracias por tu reporte.
Escribe *INICIO* para crear otro.`;
        delete sessions[from];
        break;
      }

      reply = "❌ Proceso cancelado. Escribe *INICIO* para comenzar.";
      delete sessions[from];
      break;

    default:
      reply = "⚠️ Error inesperado. Escribe *INICIO*.";
      delete sessions[from];
  }

  send(res, reply);
});

// =======================
// HELPER
// =======================
function send(res, text) {
  const twiml = new MessagingResponse();
  twiml.message(text);
  res.type("text/xml").send(twiml.toString());
}

app.listen(process.env.PORT || 3000);
