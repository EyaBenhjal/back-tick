const nodemailer = require('nodemailer');

const sendVerificationEmail = async (userEmail, token) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'eyabenhjaal@gmail.com', // Remplace avec ton email
            pass: 'bnpq ryeb qqbl guny' // Utilise un mot de passe d’application si c'est Gmail
        }
    });

    const mailOptions = {
        from: 'ton-email@gmail.com',
        to: userEmail,
        subject: 'Vérification de votre compte',
        html: `<p>Merci de vous inscrire. Cliquez sur le lien pour vérifier votre compte :</p>
               <a href="http://localhost:5000/api/auth/verify/${token}">Vérifier mon compte</a>`
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendVerificationEmail;
