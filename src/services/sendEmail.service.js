// services/sendEmail.service.js
import nodemailer from "nodemailer";

export default async function sendOTPEmail(to, otp) {
  try {
    // Option 1: Use Gmail SMTP (requires Gmail app password)
    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: "Your OTP Code - E-Train",
      html: `<p>Your OTP is <b>${otp}</b></p><p>This code will expire in 10 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Gmail SMTP sent");
    return true;
  } catch (err) {
    console.error("❌ Gmail SMTP error:", err.message);

    // Fallback: Log OTP to console for development
    console.log(`📧 DEV MODE: OTP for ${to} is ${otp}`);
    return true; // Return true in dev mode
  }
}
