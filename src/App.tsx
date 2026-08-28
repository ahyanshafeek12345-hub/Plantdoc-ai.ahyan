import React, { useState, useRef } from 'react';
import { Camera, Upload, Search, Bug, Pill, Leaf, History } from 'lucide-react';

export default function App() {
  const [image, setImage] = useState(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  const handleIdentify = () => {
    if (!image) return;
    setIsIdentifying(true);
    setTimeout(() => setIsIdentifying(false), 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 antialiased font-sans">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Leaf className="text-green-600 w-6 h-6" />
          <h1 className="text-xl font-bold">AH plantdocAI</h1>
        </div>
        <button
          onClick={() => alert('Show diagnose history')}
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
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center transition-colors hover:border-green-500 mb-6 cursor-pointer"
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <Upload className="text-green-600" />
              </div>
              <p className="text-lg font-medium">
                {image ? 'Photo selected' : 'Drop your plant photo here'}
              </p>
              <p className="text-sm text-gray-500">or use one of the options below</p>
            </div>
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
            <Search size={22} /> {isIdentifying ? 'Identifying...' : 'Identify'}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard icon={<Leaf className="text-green-600" />} title="Plant species" desc="Identify thousands of species" />
          <FeatureCard icon={<Bug className="text-red-500" />} title="Diseases & pests" desc="Detect health issues early" />
          <FeatureCard icon={<Pill className="text-blue-500" />} title="Treat" desc="Get tailored solutions" />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl border">
      <div className="mb-4">{icon}</div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
  );
}