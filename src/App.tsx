import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Search, Bug, Pill, Leaf, History, X, AlertTriangle, CheckCircle, Download, Trash2, ChevronRight, Share } from 'lucide-react';

interface AnalysisResult {
  plantName: string;
  severity: 'healthy' | 'low' | 'medium' | 'high';
  diagnosis: string;
  treatment: string[];
}

interface HistoryItem {
  id: number;
  image: string;
  result: AnalysisResult;
  date: string;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // History states
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [swipedId, setSwipedId] = useState<number | null>(null);

  // Touch tracking for slide-to-delete action
  const touchStartX = useRef<number>(0);
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Detect iOS for custom manual install banner
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    if (isIos && !isInStandaloneMode) {
      setIsIOSDevice(true);
      setShowInstallBanner(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOSDevice) {
      alert("To install this app on your iPhone: tap the Share button below in Safari, then select 'Add to Home Screen'.");
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setShowInstallBanner(false);
  };

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
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image, mimeType }),
      });

      if (!res.ok) throw new Error('Failed to connect to plant doctor server.');

      const responseText = await res.text();
      
      // Robust JSON extraction matching inner code blocks or raw strings
      let cleanedJSON = responseText.trim();
      const jsonMatch = cleanedJSON.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        cleanedJSON = jsonMatch[1].trim();
      }
      
      const parsedResult: AnalysisResult = JSON.parse(cleanedJSON);
      
      setIsIdentifying(false);
      setResult(parsedResult);
      setHistory((prev) => [
        {
          id: Date.now(),
          image: image,
          result: parsedResult,
          date: new Date().toLocaleString(),
        },
        ...prev,
      ]);
    } catch (error) {
      console.error(error);
      setIsIdentifying(false);
      setResult({
        plantName: 'Analysis Error',
        severity: 'high',
        diagnosis: 'Could not interpret response from the AI backend model. Please verify your GEMINI_API_KEY environment variable.',
        treatment: ['Check server Vercel logs', 'Ensure valid image format', 'Try again']
      });
    }
  };

  const deleteHistoryItem = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (swipedId === id) setSwipedId(null);
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'healthy':
        return {
          bg: 'bg-green-50 border-green-200 text-green-900',
          badge: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="text-green-600 w-5 h-5" />,
          label: 'Healthy'
        };
      case 'low':
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-900',
          badge: 'bg-blue-100 text-blue-800',
          icon: <AlertTriangle className="text-blue-500 w-5 h-5" />,
          label: 'Minor Issue'
        };
      case 'medium':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-900',
          badge: 'bg-amber-100 text-amber-800',
          icon: <AlertTriangle className="text-amber-500 w-5 h-5" />,
          label: 'Moderate Risk'
        };
      case 'high':
      default:
        return {
          bg: 'bg-red-50 border-red-200 text-red-900',
          badge: 'bg-red-100 text-red-800',
          icon: <Bug className="text-red-500 w-5 h-5" />,
          label: 'Severe Issue / Disease'
        };
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 antialiased font-sans relative">
      {/* Install App Notification Banner (Supports iOS & Android) */}
      {showInstallBanner && (
        <div className="bg-green-600 text-white px-4 py-3 shadow-md flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Leaf className="w-6 h-6 animate-bounce" />
            <div>
              <p className="font-bold text-sm">Install AH plantdocAI</p>
              <p className="text-xs text-green-100">
                {isIOSDevice ? 'Tap Share and select "Add to Home Screen"' : 'Add to your home screen for quick diagnosis!'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="bg-white text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-green-50 transition-colors flex items-center gap-1"
            >
              {isIOSDevice ? <Share size={14} /> : <Download size={14} />} {isIOSDevice ? 'How' : 'Install'}
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="text-green-200 hover:text-white p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Leaf className="text-green-600 w-6 h-6" />
          <h1 className="text-xl font-bold">AH plantdocAI</h1>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          <History size={18} />
          <span>History ({history.length})</span>
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
                <p className="text-sm text-gray-500">or use camera / browse option below</p>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-medium transition-colors"
            >
              <Camera size={20} /> Take Photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-medium transition-colors"
            >
              <Upload size={20} /> Browse
            </button>
          </div>

          <button
            onClick={handleIdentify}
            disabled={!image || isIdentifying}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Search size={22} /> {isIdentifying ? 'Analyzing Plant...' : 'Identify & Diagnose'}
          </button>

          {result && (() => {
            const style = getSeverityStyles(result.severity);
            return (
              <div className={`mt-6 p-6 border rounded-xl text-left transition-all ${style.bg}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-75">Identified Plant</span>
                    <h3 className="text-xl font-bold">{result.plantName}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${style.badge}`}>
                    {style.icon} {style.label}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-sm opacity-80 mb-1">Diagnosis</h4>
                  <p className="text-base leading-relaxed">{result.diagnosis}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm opacity-80 mb-2">Actionable Treatment Plan</h4>
                  <ul className="space-y-1.5">
                    {result.treatment.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="font-bold mt-0.5">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard icon={<Leaf className="text-green-600 w-6 h-6" />} title="Plant species" desc="Identify thousands of species instantly" />
          <FeatureCard icon={<Bug className="text-red-500 w-6 h-6" />} title="Severity & Pests" desc="Color-coded tracking for diseases and deficiencies" />
          <FeatureCard icon={<Pill className="text-blue-500 w-6 h-6" />} title="Treatment Plan" desc="Get tailored, step-by-step healing solutions" />
        </div>
      </main>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col relative shadow-xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Diagnose History</h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-700">
                <X size={22} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No diagnoses yet. Identify a plant to keep track of its history.</p>
              ) : (
                <p className="text-xs text-gray-400 text-center mb-2">💡 Swipe left on an item to delete, or click to view details.</p>
              )}
              
              {history.map((item) => {
                const style = getSeverityStyles(item.result.severity);
                const isSwiped = swipedId === item.id;
                
                return (
                  <div 
                    key={item.id} 
                    className="relative overflow-hidden rounded-xl border bg-white shadow-xs transition-all"
                    onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                    onTouchEnd={(e) => {
                      const diff = touchStartX.current - e.changedTouches[0].clientX;
                      if (diff > 50) setSwipedId(item.id); // swipe left revealed delete
                      else if (diff < -30) setSwipedId(null); // swipe right to close delete
                    }}
                  >
                    {/* Background Delete Action Reveal */}
                    <div className="absolute inset-y-0 right-0 w-24 bg-red-600 flex items-center justify-center text-white font-bold cursor-pointer"
                         onClick={(e) => deleteHistoryItem(item.id, e)}>
                      <Trash2 size={20} />
                    </div>

                    {/* Foreground Card Content */}
                    <div 
                      onClick={() => setSelectedHistoryItem(item)}
                      style={{ transform: isSwiped ? 'translateX(-96px)' : 'translateX(0)' }}
                      className="flex items-center gap-3 p-3 bg-white relative z-10 transition-transform duration-200 cursor-pointer hover:bg-gray-50"
                    >
                      <img src={item.image} alt="History thumbnail" className="w-14 h-14 object-cover rounded-lg border flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-semibold text-sm truncate">{item.result.plantName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${style.badge}`}>{style.label}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mb-1">{item.date}</p>
                        <p className="text-gray-600 text-xs truncate">{item.result.diagnosis}</p>
                      </div>
                      <button 
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="text-gray-300 hover:text-red-500 p-1 md:block hidden"
                        title="Delete entry"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* History Detail Modal (Click to View) */}
      {selectedHistoryItem && (() => {
        const style = getSeverityStyles(selectedHistoryItem.result.severity);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 relative shadow-2xl">
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              >
                <X size={24} />
              </button>
              
              <img src={selectedHistoryItem.image} alt="Plant details" className="w-full h-48 object-cover rounded-lg mb-4 border" />
              
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{selectedHistoryItem.date}</span>
                  <h3 className="text-2xl font-bold">{selectedHistoryItem.result.plantName}</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${style.badge}`}>
                  {style.icon} {style.label}
                </span>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold text-sm text-gray-700 mb-1">Diagnosis</h4>
                <p className="text-sm leading-relaxed text-gray-600">{selectedHistoryItem.result.diagnosis}</p>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Treatment Plan</h4>
                <ul className="space-y-1.5">
                  {selectedHistoryItem.result.treatment.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="font-bold text-green-600">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => {
                  deleteHistoryItem(selectedHistoryItem.id);
                  setSelectedHistoryItem(null);
                }}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 size={16} /> Delete from History
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl border shadow-sm">
      <div className="mb-4">{icon}</div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
  );
}
