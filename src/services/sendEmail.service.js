// services/sendEmail.service.js
import axios from "axios";

export default async function sendOTPEmail(to, otp) {
  try {
    await axios.post(
      "https://send.api.mailtrap.io/api/send",
      {
        from: { email: "trainbookings@demomailtrap.com", name: "E-Train" },
        to: [{ email: to }],
        subject: "Your OTP Code",
        html: `<p>Your OTP is <b>${otp}</b></p>`,
      },
      {
        headers: {
          Authorization: `Bearer 0e47d17d9e687e7cd2d1300a5aa242cb`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    console.log("✅ Mailtrap API sent");
    return true;
  } catch (err) {
    console.error("❌ Mailtrap API error:", err?.response?.data || err.message);
    return false;
  }
}
