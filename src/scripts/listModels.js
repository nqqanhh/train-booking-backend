import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function listModels() {
  try {
    const res = await genAI.listModels();
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
}
listModels();