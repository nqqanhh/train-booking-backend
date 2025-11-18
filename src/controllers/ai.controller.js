import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

export const chatWithAI = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        error: "Invalid request",
        details: "Request body is empty. Please provide a message.",
      });
    }

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required",
        details:
          "Cannot destructure property 'message' of 'req.body' as it is undefined.",
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(message);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error("Gemini API error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};
