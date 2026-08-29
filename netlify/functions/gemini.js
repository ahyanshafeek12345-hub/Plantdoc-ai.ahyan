const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { base64Image, mimeType } = JSON.parse(event.body);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Analyze this plant image. Return your answer strictly in valid JSON format with no markdown formatting around it (do not use \`\`\`json ... \`\`\`), matching this structure:
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

    return {
      statusCode: 200,
      body: response.response.text(),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
