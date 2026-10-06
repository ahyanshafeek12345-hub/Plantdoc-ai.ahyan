const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { base64Image, mimeType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || '';
    
    if (!apiKey) {
      console.error("CRITICAL: GEMINI_API_KEY is missing from environment variables.");
      return res.status(500).json({ error: "Missing API Key" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Updated to use the active gemini-3.7-flash model
    const model = genAI.getGenerativeModel({ model: "gemini-3.7-flash" });

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
          mimeType: mimeType || 'image/jpeg',
        },
      },
      prompt,
    ]);

    return res.status(200).send(response.response.text());
  } catch (error) {
    console.error("GEMINI FUNCTION ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};
