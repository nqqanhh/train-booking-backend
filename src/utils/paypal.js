import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PP_BASE = process.env.PAYPAL_BASE || "https://api-m.sandbox.paypal.com";
const PP_ID =
  process.env.PAYPAL_CLIENT_ID ||
  "AXtyygzNt1WNT5t-R8vGeZL8B_ZiycKu_9v35ikHJ8q0HUzMVlKGSegHct9QuLOp-dYlXzZ2jAHWXEBd";
const PP_SECRET =
  process.env.PP_CLIENT_SECRET ||
  "EIvz-zBnQn5cCOrcBGuxMi5UXc__dDqVZNmjZUyOsp0gAQ_ESPgkSufD5GbYd7zXK-mNB2sme9bDtqsa";

export async function getPaypalToken() {
  const res = await axios({
    method: "post",
    url: `${PP_BASE}/v1/oauth2/token`,
    auth: { username: PP_ID, password: PP_SECRET },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: "grant_type=client_credentials",
    timeout: 15000,
  });
  return res.data.access_token;
}

export { PP_BASE };
