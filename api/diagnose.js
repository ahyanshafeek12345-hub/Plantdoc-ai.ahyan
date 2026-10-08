const { GoogleGenAI, Type } = require('@google/genai');

// Primary model first, backup(s) after. Change names to whatever your account supports.
const MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
];

const ATTEMPTS_PER_MODEL = 2;

const plantDiagnosisSchema = {
  type: Type.OBJECT,
  properties: {
    plantName: { type: Type.STRING, description: "Name of the plant species, or 'Unknown' if the image is not a plant" },
    severity: {
      type: Type.STRING,
      enum: ['healthy', 'low', 'medium', 'high'],
      description: 'The severity level of the issue found',
    },
    diagnosis: { type: Type.STRING, description: 'Detailed explanation of diseases, pests, or deficiencies found.' },
    treatment: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Step-by-step treatment actions',
    },
  },
  required: ['plantName', 'severity', 'diagnosis', 'treatment'],
};

const prompt = `Analyze this plant image and provide the diagnosis data matching the required schema structure. If the image does not show a plant, set plantName to "Unknown", severity to "healthy", and explain in the diagnosis.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isRetryable = (err) => {
  const status = err && (err.status || err.code);
  return status === 503 || status === 429 || status === 500 || status === 504;
};

// Tries each model in order, retrying transient errors with backoff.
async function generateWithFallback(ai, baseParams) {
  let lastErr;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const response = await ai.models.generateContent({ ...baseParams, model });
        console.log(`Diagnosis succeeded with model: ${model}`);
        return response;
      } catch (err) {
        lastErr = err;
        console.warn(`Model ${model} attempt ${attempt + 1} failed:`, err && err.status);
        if (!isRetryable(err)) {
          // 404 (bad model name) -> skip to next model; anything else (400, 401, 403) -> stop
          if (err && err.status === 404) break;
          throw err;
        }
        await sleep(700 * 2 ** attempt + Math.random() * 300);
      }
    }
  }
  throw lastErr;
}

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

    const response = await generateWithFallback(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64Image, mimeType: mimeType || 'image/jpeg' } },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: plantDiagnosisSchema,
      },
    });

    let result;
    try {
      result = JSON.parse(response.text);
    } catch (parseErr) {
      console.error('Could not parse model output:', response.text);
      return res.status(502).json({ error: 'Received an invalid response from the diagnosis service. Please try again.' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('GEMINI FUNCTION ERROR:', error);
    const status = error && error.status;
    if (status === 503 || status === 429 || status === 500 || status === 504) {
      return res.status(503).json({ error: 'Diagnosis service is busy. Please try again in a moment.' });
    }
    return res.status(500).json({ error: 'Failed to analyze image' });
  }
};
