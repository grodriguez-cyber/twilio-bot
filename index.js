const express = require("express");
const bodyParser = require("body-parser");
const { MessagingResponse } = require("twilio").twiml;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const sessions = {};

// ===================
// CATEGORÍAS (5)
// ===================
const categorias = {
"1": "🕳️ Bache",
"2": "💡 Alumbrado",
"3": "💧 Agua potable",
"4": "🌳 Arbolado",
"5": "🚧 Obra pública"
};

// ===================
// DETALLES POR TIPO
// ===================
const detallesPorCategoria = {
"🕳️ Bache": [
  "Leve (se puede esquivar)",
  "Media (daña si no lo ves)",
  "Alta (muy peligroso)"
],
"💡 Alumbrado": [
  "No prende",
  "Dañado",
  "Prendido durante el día"
],
"💧 Agua potable": [
  "Goteo constante",
  "Fuga considerable",
  "Fuga con ruido"
],
"🌳 Arbolado": [
  "Rama caída",
  "Bloquea el paso",
  "Riesgo de caer"
],
"🚧 Obra pública": [
  "Obstrucción",
  "Material suelto",
  "Daño visible"
]
};

// ===================
// ENDPOINT
// ===================
app.post("/whatsapp", (req, res) => {
const from = req.body.From;
const msg = req.body.Body?.trim();
const lat = req.body.Latitude;
const lng = req.body.Longitude;
const media = req.body.MediaUrl0;

if (!sessions[from]) sessions[from] = { step: 0 };
const user = sessions[from];

const comando = msg?.toLowerCase();
const twiml = new MessagingResponse();
let reply = "";

// ===================
// COMANDOS GLOBALES
// ===================
if (["inicio", "reiniciar"].includes(comando)) {
  sessions[from] = { step: 0 };
  twiml.message("🔄 Proceso reiniciado.");
  return res.type("text/xml").send(twiml.toString());
}

if (["salir", "cancelar"].includes(comando)) {
  delete sessions[from];
  twiml.message("👋 Proceso cancelado.");
  return res.type("text/xml").send(twiml.toString());
}

// ===================
// FLUJO
// ===================
switch (user.step) {

  // STATE 0 — WELCOME
  case 0:
    reply = `👋 Hola, soy el bot de *Reporte Ciudadano del Ayuntamiento de Xalapa*.

Te haré 3 preguntas:
Tipo de reporte
Ubicación
Detalle

1️⃣ Continuar
2️⃣ Salir`;
    user.step = 1;
    break;

  // STATE 1 — CONTINUE
  case 1:
    if (msg !== "1") {
      delete sessions[from];
      reply = "👋 Proceso cancelado.";
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

  // STATE 2 — CATEGORY
  case 2:
    if (!categorias[msg]) {
      reply = "❌ Responde con un número del 1 al 5.";
      break;
    }

    user.categoria = categorias[msg];
    reply = `📍 Ahora envía tu ubicación.

Puedes:
📎 Enviar ubicación GPS
✍️ O escribir dirección y referencias`;
    user.step = 3;
    break;

  // STATE 3 — LOCATION
  case 3:
    if (lat && lng) {
      user.ubicacion = {
        tipo: "GPS",
        lat,
        lng
      };
    } else if (msg) {
      user.ubicacion = {
        tipo: "TEXTO",
        descripcion: msg
      };
    } else {
      reply = "⚠️ Envía la ubicación o escribe la dirección.";
      break;
    }

    const opciones = detallesPorCategoria[user.categoria]
      .map((o, i) => `${i + 1}️⃣ ${o}`)
      .join("\n");

    reply = `📝 ${user.categoria}
Selecciona el detalle:

${opciones}`;

    user.step = 4;
    break;

  // STATE 4 — DETAIL
  case 4:
    const detalle = detallesPorCategoria[user.categoria][msg - 1];
    if (!detalle) {
      reply = "❌ Selecciona una opción válida.";
      break;
    }

    user.detalle = detalle;
    reply = `📸 ¿Deseas enviar una foto?

1️⃣ Enviar foto
2️⃣ Omitir`;
    user.step = 5;
    break;

  // STATE 5 — PHOTO DECISION
  case 5:
    if (msg === "1") {
      reply = "📸 Envía la foto ahora o escribe *omitir*.";
      user.step = 6;
      break;
    }

    if (msg === "2") {
      user.foto = false;
      user.step = 7;
      break;
    }

    reply = "❌ Responde 1 o 2.";
    break;

  // STATE 6 — WAIT PHOTO
  case 6:
    if (media) {
      user.foto = media;
    } else {
      user.foto = false;
    }
    user.step = 7;
    break;

  // STATE 7 — CONTACT
  case 7:
    reply = `👤 ¿Deseas dejar datos para seguimiento?

1️⃣ Sí
2️⃣ No (anónimo)`;
    user.step = 8;
    break;

  // STATE 8 — CONFIRM
case 8:
    user.anonimo = msg === "2";

    const ubicacionTexto =
      user.ubicacion.tipo === "GPS"
        ? `https://maps.google.com?q=${user.ubicacion.lat},${user.ubicacion.lng}`
        : user.ubicacion.descripcion;

    reply = `📋 *Resumen del reporte*

Tipo: ${user.categoria}
Ubicación: ${ubicacionTexto}
Detalle: ${user.detalle}
Foto: ${user.foto ? "Sí" : "No"}
Contacto: ${user.anonimo ? "Anónimo" : "Sí"}

1️⃣ Confirmar
2️⃣ Cancelar`;

    user.step = 9;
    break;

  // STATE 9 — FOLIO
  case 9:
    if (msg !== "1") {
      delete sessions[from];
      reply = "❌ Reporte cancelado.";
      break;
    }

    const folio = `XAL-${Date.now()}`;
    reply = `✅ Reporte registrado correctamente.

🆔 Folio: ${folio}

Gracias por tu reporte.
Escribe *inicio* para hacer otro.`;

    delete sessions[from];
    break;

  default:
    delete sessions[from];
    reply = "⚠️ Error. Escribe *inicio*.";
}

twiml.message(reply);
res.type("text/xml").send(twiml.toString());
});

app.listen(process.env.PORT || 3000);
