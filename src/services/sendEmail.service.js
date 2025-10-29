import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 587,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

export default async function sendOTPEmail(to, otp) {
  try {
    const info = await transporter.sendMail({
      from: '"E-Train" <trainbookings@demomailtrap.co>',
      to,
      subject: "Your OTP Code",
      html: `<p>Your OTP is <b>${otp}</b></p>`,
    });
    console.log("✅ Sent via Mailtrap:", info.messageId);
  } catch (err) {
    console.error("❌ Mailtrap send error:", err);
  }
}
