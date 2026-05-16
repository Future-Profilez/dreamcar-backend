const nodemailer = require('nodemailer');
const logger = require('./Logger');

const sendEmail = async (data) => {
    const { email, subject, emailHtml } = data;
    
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = process.env.SMTP_PORT || 587;
    const user = process.env.SMTP_USER || "mern.dev.fp01@gmail.com";
    const pass = process.env.SMTP_PASS || "xqblmcptbmvozyrn";

    let transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: port == 465, // true for 465, false for other ports
        auth: {
            user: user,
            pass: pass,
        },
    });

    const mailOptions = {
        from: `"Dream Car Competitions" <${user}>`,
        to: email,
        subject: subject,
        html: emailHtml,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to: ${info.accepted}, MessageID: ${info.messageId}`);
    } catch (error) {
        console.error('❌ Error sending email:', error);
        logger.error('Error sending email:', error);
        throw error;
    }
};

module.exports = sendEmail;
