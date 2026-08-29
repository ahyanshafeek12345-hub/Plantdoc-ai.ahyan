import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { base64Image, mimeType } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY || '';
    
    if (!apiKey) {
      console.error("CRITICAL: GEMINI_API_KEY is missing from environment variables.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `
      Analyze this plant image. Return your answer strictly in valid JSON format with no markdown formatting around it, matching this structure:
      {
        "plantName": "Name of the plant species",
        "severity": "healthy" | "low" | "medium" | "high",
        "diagnosis": "Detailed explanation of diseases, pests, or deficiencies found.",
        "treatment": ["Step 1 treatment action", "Step 2 treatment action", "Step 3 treatment action"]
      }
    `;

    const response = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    return new Response(response.response.text(), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("GEMINI FUNCTION ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
