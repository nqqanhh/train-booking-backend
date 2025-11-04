// services/sendEmail.service.js
import axios from "axios";
import "dotenv/config";
export default async function sendOTPEmail(to, otp) {
  try {
    const apiToken = process.env.MAILTRAP_API_TOKEN;
    if (!apiToken) {
      console.error("❌ MAILTRAP_API_TOKEN not set in environment variables");
      return false;
    }

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
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    console.log("✅ Mailtrap API sent");
    return true;
  } catch (err) {
    console.error("❌ Mailtrap API error:", err?.response?.data || err.message);
    console.error("❌ API Token used:", apiToken ? "Set" : "Not set");
    return false;
  }
}
