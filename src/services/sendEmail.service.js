import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // 465 = SSL
  secure: true, // true cho 465
  auth: {
    user: process.env.SMTP_USER, // yourgmail@gmail.com
    pass: process.env.SMTP_APP_PASSWORD, // 16 ký tự App Password
  },
  pool: true, // optional: connection pool
  maxConnections: 3,
  maxMessages: 50,
  tls: { minVersion: "TLSv1.2" },
  logger: true, // để xem log
  debug: true, // để xem log chi tiết SMTP
});
export default async function sendOTPEmail(recipientEmail, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender address
    to: recipientEmail, // Recipient address
    subject: "Your One-Time Password (OTP)",
    html: `<p>Your OTP for verification is: <strong>${otp}</strong></p><p>This OTP is valid for a limited time.</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("OTP email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return false;
  }
}
