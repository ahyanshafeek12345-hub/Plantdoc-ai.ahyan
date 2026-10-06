// Upgraded to the correct modern Google Gen AI SDK
const { GoogleGenAI, Type } = require('@google/genai');

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

    // Initialize using the modern GoogleGenAI constructor
    const ai = new GoogleGenAI({ apiKey });

    // Define a rigid schema to enforce proper JSON parsing on the model output
    const plantDiagnosisSchema = {
      type: Type.OBJECT,
      properties: {
        plantName: { type: Type.STRING, description: "Name of the plant species" },
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

    const prompt = `Analyze this plant image and provide the diagnosis data matching the required schema structure.`;

    // Using the interactions endpoint on the stable gemini-3.8-flash model
    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType || 'image/jpeg',
          },
        },
        prompt,
      ],
      // Enforce zero markdown wrapper clutter via strict API configuration
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: plantDiagnosisSchema
      }
    });

    // interaction.output_text is now guaranteed to be pure, valid JSON string
    return res.status(200).send(interaction.output_text);
  } catch (error) {
    console.error("GEMINI FUNCTION ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};
