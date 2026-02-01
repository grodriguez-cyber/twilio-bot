const express = require("express");
const bodyParser = require("body-parser");
const { MessagingResponse } = require("twilio").twiml;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const sessions = {};

// VALIDADORES
const validarNombre = n => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,}$/.test(n);
const validarCorreo = c => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
const validarTelefono = t => /^[0-9]{8,15}$/.test(t);

app.get("/", (req, res) => res.send("OK"));

app.post("/whatsapp", (req, res) => {
  const from = req.body.From;
  const msg = req.body.Body?.trim();
  const lat = req.body.Latitude;
  const lng = req.body.Longitude;

  if (!sessions[from]) sessions[from] = { step: 1 };

  const user = sessions[from];
  let reply = "";

  // Reinicio manual
  if (msg?.toLowerCase() === "hola") {
    sessions[from] = { step: 1 };
    user.step = 1;
  }

  switch (user.step) {
    case 1:
      reply = `👋 Bienvenido a *Energie Consultores*

¿Qué deseas hacer?

1️⃣ Dar de alta incidencia  
2️⃣ Buscar folio`;
      user.step = 2;
      break;

    case 2:
      if (msg !== "1") {
        reply = "⚠️ Por ahora solo está disponible el alta de incidencias.\nEscribe *1*.";
        break;
      }
      reply = `📋 Tipo de incidencia:
1️⃣ Incendio
2️⃣ Bache
3️⃣ Luminaria
4️⃣ Basura
5️⃣ Fuga de agua
6️⃣ Corto eléctrico
7️⃣ Semáforo dañado
8️⃣ Ruido excesivo
9️⃣ Animal en peligro
🔟 Sospecha de delito
1️⃣1️⃣ Choque
1️⃣2️⃣ Árbol caído`;
      user.step = 3;
      break;

    case 3:
      user.tipo = msg;
      reply = "✍️ Escribe tu nombre completo:";
      user.step = 4;
      break;

    case 4:
      if (!validarNombre(msg)) {
        reply = "❌ Nombre inválido. Usa solo letras y mínimo 3 caracteres.";
        break;
      }
      user.nombre = msg;
      reply = "📧 Escribe tu correo electrónico:";
      user.step = 5;
      break;

    case 5:
      if (!validarCorreo(msg)) {
        reply = "❌ Correo inválido. Ejemplo: nombre@correo.com";
        break;
      }
      user.correo = msg;
      reply = "📱 Escribe tu número telefónico:";
      user.step = 6;
      break;

    case 6:
      if (!validarTelefono(msg)) {
        reply = "❌ Teléfono inválido. Solo números (8 a 15 dígitos).";
        break;
      }
      user.telefono = msg;
      reply = "📍 Envía tu ubicación GPS usando el botón 📎 → Ubicación";
      user.step = 7;
      break;

    case 7:
      if (!lat || !lng) {
        reply = "⚠️ Debes enviar tu ubicación usando el botón 📍.";
        break;
      }
      user.lat = lat;
      user.lng = lng;
      reply = "📝 Describe brevemente el problema:";
      user.step = 8;
      break;

    case 8:
      if (msg.length < 10) {
        reply = "❌ La descripción debe tener al menos 10 caracteres.";
        break;
      }
      user.descripcion = msg;

      reply = `✅ *Confirma tu reporte*

📌 Tipo: ${user.tipo}
👤 Nombre: ${user.nombre}
📧 Correo: ${user.correo}
📱 Tel: ${user.telefono}
📍 Ubicación: ${user.lat}, ${user.lng}
📝 Descripción: ${user.descripcion}

1️⃣ Confirmar  
2️⃣ Cancelar`;

      user.step = 9;
      break;

    case 9:
      if (msg === "1") {
        reply = `✅ *Reporte enviado correctamente*
🆔 Folio: INC-${Date.now()}
Gracias por tu reporte.`;
        delete sessions[from];
      } else {
        reply = "❌ Reporte cancelado. Escribe *Hola* para iniciar nuevamente.";
        delete sessions[from];
      }
      break;

    default:
      reply = "⚠️ Error inesperado. Escribe *Hola*.";
      delete sessions[from];
  }

  const twiml = new MessagingResponse();
  twiml.message(reply);
  res.type("text/xml").send(twiml.toString());
});

app.listen(process.env.PORT || 3000);
