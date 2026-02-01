const express = require("express");
const bodyParser = require("body-parser");
const { MessagingResponse } = require("twilio").twiml;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const sessions = {};

const validarNombre = n => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,}$/.test(n);
const validarCorreo = c => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
const validarTelefono = t => /^[0-9]{8,15}$/.test(t);

const descripcionesPorTipo = {
"🔥 Incendio": {
pregunta: "🔥 ¿Qué tipo de incidente observas?",
opciones: {
  "1": "Fuego visible",
  "2": "Humo abundante",
  "3": "Explosión previa"
}
},
"🕳️ Bache": {
pregunta: "🕳️ ¿Cómo es el bache?",
opciones: {
  "1": "Bache pequeño",
  "2": "Bache profundo",
  "3": "Bache con agua"
}
},
"💡 Luminaria": {
pregunta: "💡 ¿Qué problema presenta la luminaria?",
opciones: {
  "1": "No prende",
  "2": "Con daños",
  "3": "Sigue prendida durante el día"
}
},
"🗑️ Basura acumulada": {
pregunta: "🗑️ ¿Qué situación se presenta?",
opciones: {
  "1": "Contenedor lleno",
  "2": "Basura regada",
  "3": "Olor desagradable"
}
},
"💧 Fuga de agua": {
pregunta: "💧 ¿Cómo es la fuga?",
opciones: {
  "1": "Goteo constante",
  "2": "Fuga considerable",
  "3": "Fuga con ruido"
}
},
"⚡ Corto eléctrico": {
pregunta: "⚡ ¿Qué se observa?",
opciones: {
  "1": "Chispa visible",
  "2": "Cable caído",
  "3": "Ruido extraño"
}
},
"🚦 Semáforo dañado": {
pregunta: "🚦 ¿Cuál es el problema del semáforo?",
opciones: {
  "1": "Apagado",
  "2": "Desincronizado",
  "3": "Intermitente"
}
},
"🔊 Ruido excesivo": {
pregunta: "🔊 ¿Qué tipo de ruido es?",
opciones: {
  "1": "Volumen alto",
  "2": "En horario prohibido",
  "3": "Constante"
}
},
"🐕 Animal en peligro": {
pregunta: "🐕 ¿Qué situación presenta el animal?",
opciones: {
  "1": "Animal agresivo",
  "2": "Animal herido",
  "3": "Animal abandonado"
}
},
"🚨 Sospecha de delito": {
pregunta: "🚨 ¿Qué observas?",
opciones: {
  "1": "Actitud sospechosa",
  "2": "Vandalismo",
  "3": "Posible robo"
}
},
"🚗 Choque de vehículos": {
pregunta: "🚗 ¿Qué tipo de choque ocurrió?",
opciones: {
  "1": "Colisión leve",
  "2": "Choque múltiple",
  "3": "Obstrucción vial"
}
},
"🌳 Árbol caído": {
pregunta: "🌳 ¿Qué situación presenta el árbol?",
opciones: {
  "1": "Rama caída",
  "2": "Árbol bloqueando paso",
  "3": "Árbol en riesgo de caer"
}
}
};


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
const mapaUrl = `https://www.google.com/maps?q=${user.lat},${user.lng}`;

// 🔴 COMANDOS GLOBALES
const comando = msg?.toLowerCase();
const reinicio = ["inicio", "reiniciar", "empezar"]; // Se pueden añadir más si gustan
const salir = ["salir", "cancelar", "terminar"];

if (reinicio.includes(comando)) {
  sessions[from] = { step: 1 };
  const twiml = new MessagingResponse();
  twiml.message("🔄 El proceso se reinició. Escribe cualquier mensaje para comenzar.");
  return res.type("text/xml").send(twiml.toString());
}

if (salir.includes(comando)) {
  delete sessions[from];
  const twiml = new MessagingResponse();
  twiml.message("👋 Proceso cancelado. Si deseas iniciar nuevamente, escribe *inicio*.");
  return res.type("text/xml").send(twiml.toString());
}




if (msg?.toLowerCase() === "hola") {
sessions[from] = { step: 1 };
user.step = 1;
}

switch (user.step) {

case 1:
reply = `👋 Bienvenido a *Energie Consultores*

1️⃣ Dar de alta incidencia  
2️⃣ Buscar folio`;
user.step = 2;
break;

case 2:
if (msg !== "1") {
  reply = "⚠️ Solo está disponible el alta de incidencias.\nEscribe *1*.";
  break;
}

reply = `📋 Selecciona el tipo:

🔥 1. Incendio  
🕳️ 2. Bache  
💡 3. Luminaria  
🗑️ 4. Basura  
💧 5. Fuga  
⚡ 6. Corto eléctrico  
🚦 7. Semáforo  
🔊 8. Ruido  
🐕 9. Animal  
🚨 10. Sospecha  
🚗 11. Choque  
🌳 12. Árbol caído`;

user.step = 3;
break;

case 3:
if (!tiposIncidencia[msg]) {
  reply = "❌ Selecciona un número válido (1–12).";
  break;
}
user.tipo = tiposIncidencia[msg];
reply = "✍️ Escribe tu nombre completo:";
user.step = 4;
break;

case 4:
if (!validarNombre(msg)) {
  reply = "❌ Nombre inválido.";
  break;
}
user.nombre = msg;
reply = "📱 Escribe tu teléfono:";
user.step = 6;
break;

case 6:
if (!validarTelefono(msg)) {
  reply = "❌ Teléfono inválido.";
  break;
}
user.telefono = msg;
reply = "📍 Envía tu ubicación.";
user.step = 7;
break;

case 7:
if (!lat || !lng) {
  reply = "⚠️ Debes enviar la ubicación con el botón 📍.";
  break;
}
user.lat = lat;
user.lng = lng;
const data = descripcionesPorTipo[user.tipo];

let opcionesTexto = Object.entries(data.opciones)
  .map(([k, v]) => `${k}️⃣ ${v}`)
  .join("\n");

reply = `${data.pregunta}

${opcionesTexto}

Responde con el número.`;

user.awaitingDetalle = true;
user.step = 12;

break;

case 9:
if (msg === "1") {
  reply = `✅ Reporte enviado
🆔 Folio: INC-${Date.now()}`;
  delete sessions[from];
  break;
}

reply = `✏️ ¿Qué deseas modificar?

1️⃣ Tipo
2️⃣ Nombre
3️⃣ Correo
4️⃣ Teléfono
5️⃣ Ubicación
6️⃣ Descripción`;

user.step = 10;
break;

case 10:
const campos = {
  "1": "tipo",
  "2": "nombre",
  "3": "correo",
  "4": "telefono",
  "5": "ubicacion",
  "6": "descripcion"
};

if (!campos[msg]) {
  reply = "⚠️ Opción inválida.";
  break;
}

user.editingField = campos[msg];

const preguntas = {
  tipo: "🔁 Escribe el número del tipo:",
  nombre: "✍️ Escribe tu nombre:",
  correo: "📧 Escribe tu correo:",
  telefono: "📱 Escribe tu teléfono:",
  ubicacion: "📍 Envía tu ubicación:",
  descripcion: "📝 Describe el problema:"
};

reply = preguntas[user.editingField];
user.step = 11;
break;

case 11:
if (user.editingField === "tipo") {
  if (!tiposIncidencia[msg]) {
    reply = "❌ Número inválido.";
    break;
  }
  user.tipo = tiposIncidencia[msg];
} else if (user.editingField === "ubicacion") {
  if (!lat || !lng) {
    reply = "⚠️ Envía la ubicación.";
    break;
  }
  user.lat = lat;
  user.lng = lng;
} else {
  user[user.editingField] = msg;
}

user.editingField = null;
user.awaitingDetalle = false;

reply = `📋 *Confirma tus datos*

1️⃣ Tipo: ${user.tipo}
2️⃣ Nombre: ${user.nombre}
3️⃣ Correo: ${user.correo}
4️⃣ Teléfono: ${user.telefono}
5️⃣ Ubicación: ${mapaUrl}
6️⃣ Detalle: ${user.descripcion}

1️⃣ Confirmar  
2️⃣ Modificar datos`;

user.step = 9;
break;


case 12:
  // Si NO estamos esperando detalle, volver a confirmación
  if (!user.awaitingDetalle) {
    reply = `📋 *Confirma tus datos*

1️⃣ Tipo: ${user.tipo}
2️⃣ Nombre: ${user.nombre}
3️⃣ Correo: ${user.correo}
4️⃣ Teléfono: ${user.telefono}
5️⃣ Ubicación: ${mapaUrl}
6️⃣ Detalle: ${user.descripcion}

1️⃣ Confirmar  
2️⃣ Modificar datos`;

    user.step = 9;
    break;
  }

  // Captura normal del detalle
  const opciones = descripcionesPorTipo[user.tipo].opciones;

  if (!opciones[msg]) {
    reply = "❌ Opción inválida. Selecciona una opción válida.";
    break;
  }

  user.descripcion = opciones[msg];
  user.awaitingDetalle = false;

  reply = `📋 *Confirma tus datos*

1️⃣ Tipo: ${user.tipo}
2️⃣ Nombre: ${user.nombre}
3️⃣ Correo: ${user.correo}
4️⃣ Teléfono: ${user.telefono}
5️⃣ Ubicación: ${mapaUrl}
6️⃣ Detalle: ${user.descripcion}

1️⃣ Confirmar  
2️⃣ Modificar datos`;

  user.step = 9;
  break;



default:
reply = "⚠️ Error. Escribe *Hola*.";
delete sessions[from];
}

const twiml = new MessagingResponse();
twiml.message(reply);
res.type("text/xml").send(twiml.toString());
});

app.listen(process.env.PORT || 3000);
