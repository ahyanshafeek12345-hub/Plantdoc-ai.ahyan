const { GoogleGenAI, Type } = require('@google/genai');

const plantDiagnosisSchema = {
  type: Type.OBJECT,
  properties: {
    plantName: { type: Type.STRING, description: "Name of the plant species, or 'Unknown' if the image is not a plant" },
    severity: {
      type: Type.STRING,
      enum: ["healthy", "low", "medium", "high"],
      description: "The severity level of the issue found"
    },
    diagnosis: { type: Type.STRING, description: "Detailed explanation of diseases, pests, or deficiencies found." },
    treatment: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Step-by-step treatment actions"
    }
  },
  required: ["plantName", "severity", "diagnosis", "treatment"]
};

const prompt = `Analyze this plant image and provide the diagnosis data matching the required schema structure. If the image does not show a plant, set plantName to "Unknown", severity to "healthy", and explain in the diagnosis.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('CRITICAL: GEMINI_API_KEY is missing from environment variables.');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    let { base64Image, mimeType } = req.body || {};
    if (!base64Image || typeof base64Image !== 'string') {
      return res.status(400).json({ error: 'base64Image is required' });
    }

    // Strip data URL prefix if present
    const match = base64Image.match(/^data:(.+?);base64,(.*)$/);
    if (match) {
      mimeType = mimeType || match[1];
      base64Image = match[2];
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64Image, mimeType: mimeType || 'image/jpeg' } },
            { text: prompt }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: plantDiagnosisSchema
      }
    });

    const result = JSON.parse(response.text);
    return res.status(200).json(result);
  } catch (error) {
    console.error('GEMINI FUNCTION ERROR:', error);
    return res.status(500).json({ error: 'Failed to analyze image' });
  }
};
