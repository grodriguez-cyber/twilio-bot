const express = require("express");
const bodyParser = require("body-parser");
const { MessagingResponse } = require("twilio").twiml;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Memoria temporal de sesiones
const sessions = {};

// Ruta raíz (obligatoria para Twilio)
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// Webhook principal
app.post("/whatsapp", (req, res) => {
  const from = req.body.From;
  const msg = req.body.Body?.trim();
  const lat = req.body.Latitude;
  const lng = req.body.Longitude;

  if (!sessions[from]) {
    sessions[from] = { step: 1 };
  }

  const user = sessions[from];
  let reply = "";

  switch (user.step) {
    case 1:
      reply = `👋 ¡Bienvenido a *Energie Consultores*!

¿Qué deseas hacer?

1️⃣ Dar de alta una incidencia  
2️⃣ Buscar un folio  

Responde con el número.`;
      user.step = 2;
      break;

    case 2:
      if (msg !== "1") {
        reply = "⚠️ Por ahora solo está disponible el alta de incidencias.\nResponde *1* para continuar.";
        break;
      }

      reply = `📋 Selecciona el tipo de incidencia:

1️⃣ Incendio  
2️⃣ Bache  
3️⃣ Luminaria  
4️⃣ Basura acumulada  
5️⃣ Fuga de agua  
6️⃣ Corto eléctrico  
7️⃣ Semáforo dañado  
8️⃣ Ruido excesivo  
9️⃣ Animal en peligro  
🔟 Sospecha de delito  
1️⃣1️⃣ Choque de vehículos  
1️⃣2️⃣ Árbol caído  

Responde con el número.`;

      user.step = 3;
      break;

    case 3:
      user.tipo = msg;
      reply = "✍️ Escribe tu nombre completo:";
      user.step = 4;
      break;

    case 4:
      user.nombre = msg;
      reply = "📧 Escribe tu correo electrónico:";
      user.step = 5;
      break;

    case 5:
      user.correo = msg;
      reply = "📱 Escribe tu número telefónico:";
      user.step = 6;
      break;

    case 6:
      user.telefono = msg;
      reply = "📍 Por favor envía tu *ubicación GPS* usando el botón 📎 → Ubicación.";
      user.step = 7;
      break;

    case 7:
      if (!lat || !lng) {
        reply = "⚠️ Debes enviar la ubicación usando el botón de WhatsApp 📍";
        break;
      }

      user.lat = lat;
      user.lng = lng;

      reply = "📝 Describe brevemente el problema:";
      user.step = 8;
      break;

    case 8:
      user.descripcion = msg;

      reply = `✅ *Reporte registrado correctamente*

📌 *Resumen:*
• Tipo: ${user.tipo}
• Nombre: ${user.nombre}
• Teléfono: ${user.telefono}
• Ubicación: ${user.lat}, ${user.lng}
• Descripción: ${user.descripcion}

🆔 Folio: INC-${Date.now()}

Gracias por tu reporte.`;

      delete sessions[from];
      break;

    default:
      reply = "❌ Ocurrió un error. Escribe *Hola* para comenzar nuevamente.";
      delete sessions[from];
  }

  const twiml = new MessagingResponse();
  twiml.message(reply);
  res.type("text/xml").send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Servidor activo en puerto", PORT);
});
