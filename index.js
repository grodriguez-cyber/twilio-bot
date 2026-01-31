const express = require("express");
const bodyParser = require("body-parser");
const { MessagingResponse } = require("twilio").twiml;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/whatsapp", (req, res) => {
  const msg = req.body.Body;
  const from = req.body.From;

  console.log("📩 Mensaje recibido:", msg);
  console.log("📞 Desde:", from);

  const twiml = new MessagingResponse();
  twiml.message("✅ Mensaje recibido correctamente");

  res.type("text/xml");
  res.send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Servidor activo en puerto", PORT);
});
