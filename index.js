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

const tiposIncidencia = {
  "1": "🔥 Incendio",
  "2": "🕳️ Bache",
  "3": "💡 Luminaria",
  "4": "🗑️ Basura acumulada",
  "5": "💧 Fuga de agua",
  "6": "⚡ Corto eléctrico",
  "7": "🚦 Semáforo dañado",
  "8": "🔊 Ruido excesivo",
  "9": "🐕 Animal en peligro",
  "10": "🚨 Sospecha de delito",
  "11": "🚗 Choque de vehículos",
  "12": "🌳 Árbol caído"
};



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
    reply = `📋 Selecciona el tipo de incidencia:

🔥 1. Incendio  
🕳️ 2. Bache  
💡 3. Luminaria  
🗑️ 4. Basura acumulada  
💧 5. Fuga de agua  
⚡ 6. Corto eléctrico  
🚦 7. Semáforo dañado  
🔊 8. Ruido excesivo  
🐕 9. Animal en peligro  
🚨 10. Sospecha de delito  
🚗 11. Choque de vehículos  
🌳 12. Árbol caído  

Responde con el número.`;
  user.step = 3;
  break;

case 3:
  if (!tiposIncidencia[msg]) {
reply = "❌ Opción inválida. Selecciona un número del 1 al 12.";
break;
}

user.tipo = tiposIncidencia[msg];

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
