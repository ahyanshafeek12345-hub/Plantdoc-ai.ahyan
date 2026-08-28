import React, { useState, useRef } from 'react';
import { Camera, Upload, Search, Bug, Pill, Leaf, History, X } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface HistoryItem {
  id: number;
  image: string;
  result: string;
  date: string;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImage(url);
      setMimeType(file.type);
      setResult(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setBase64Image(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleIdentify = async () => {
    if (!base64Image || !image) return;
    setIsIdentifying(true);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.REACT_APP_GEMINI_API_KEY || '' });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: 'Analyze this plant image. Identify the plant species, detect any diseases, pests, or nutrient deficiencies, and provide short, actionable treatment steps.',
          },
        ],
      });

      const diagnosisText = response.text || 'Could not analyze the plant image. Please try another photo.';

      setIsIdentifying(false);
      setResult(diagnosisText);
      setHistory((prev) => [
        {
          id: Date.now(),
          image: image,
          result: diagnosisText,
          date: new Date().toLocaleString(),
        },
        ...prev,
      ]);
    } catch (error) {
      console.error(error);
      setIsIdentifying(false);
      setResult('Error connecting to the plant doctor AI. Please check your API key.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 antialiased font-sans">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <Leaf className="text-green-600 w-6 h-6" />
          <h1 className="text-xl font-bold">AH plantdocAI</h1>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 text-gray-600 hover:text-green-600"
        >
          <History size={20} />
          <span>Diagnose History</span>
        </button>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <section className="text-center mb-12">
          <h2 className="text-4xl font-extrabold mb-4">What's wrong with your plant?</h2>
          <p className="text-gray-600 text-lg">Upload a photo and we will identify diseases, deficiencies, and health issues instantly.</p>
        </section>

        <div className="bg-white rounded-2xl shadow-sm border p-8 mb-12">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors mb-6 cursor-pointer overflow-hidden ${
              isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-500'
            }`}
          >
            {image ? (
              <img
                src={image}
                alt="Uploaded plant"
                className="max-h-64 mx-auto rounded-lg object-contain"
              />
            ) : (
              <div className="flex flex-col items-center py-6">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <Upload className="text-green-600" />
                </div>
                <p className="text-lg font-medium">Drop your plant photo here</p>
                <p className="text-sm text-gray-500">or use one of the options below</p>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-medium"
            >
              <Camera size={20} /> Take Photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-medium"
            >
              <Upload size={20} /> Browse
            </button>
          </div>

          <button
            onClick={handleIdentify}
            disabled={!image || isIdentifying}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2"
          >
            <Search size={22} /> {isIdentifying ? 'Analyzing Plant...' : 'Identify'}
          </button>

          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-left">
              <h3 className="font-bold text-green-800 mb-1">Diagnosis</h3>
              <p className="text-gray-700 whitespace-pre-line">{result}</p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard icon={<Leaf className="text-green-600" />} title="Plant species" desc="Identify thousands of species" />
          <FeatureCard icon={<Bug className="text-red-500" />} title="Diseases & pests" desc="Detect health issues early" />
          <FeatureCard icon={<Pill className="text-blue-500" />} title="Treat" desc="Get tailored solutions" />
        </div>
      </main>

      {showHistory && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setShowHistory(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold mb-4">Diagnose History</h2>
            {history.length === 0 ? (
              <p className="text-gray-500">No diagnoses yet. Identify a plant to see it here.</p>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="flex gap-3 border-b pb-4">
                    <img src={item.image} alt="History" className="w-16 h-16 object-cover rounded-lg" />
                    <div>
                      <p className="text-sm text-gray-400">{item.date}</p>
                      <p className="text-gray-700 text-sm whitespace-pre-line">{item.result}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl border">
      <div className="mb-4">{icon}</div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
  );
}
