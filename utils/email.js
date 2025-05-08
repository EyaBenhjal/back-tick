const nodemailer = require("nodemailer");

const sendVerificationEmail = async (email, token) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Vérifiez votre compte",
            html: `
                <h2>Bienvenue !</h2>
                <p>Merci de vous inscrire. Cliquez sur le lien pour vérifier votre compte :</p>
                <a href="${process.env.BASE_URL}/api/auth/verify/${token}">Vérifier mon compte</a>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log("✅ Email de vérification envoyé à :", email);
    } catch (error) {
        console.error("❌ Erreur lors de l'envoi de l'email :", error);
    
    }
      
};

module.exports = sendVerificationEmail;
