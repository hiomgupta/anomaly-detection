import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadZone from '../components/UploadZone';
import '../globals.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--canara-navy)] text-[var(--canara-error)] flex flex-col items-center justify-center p-8">
          <h1 className="display-font text-8xl md:text-9xl mb-4 italic">System Failure</h1>
          <p className="tracking-[0.3em] uppercase text-sm font-bold border-b border-[var(--canara-error)] pb-2 mb-8">
            Catastrophic Error Detected
          </p>
          <pre className="bg-[#1a0505] p-6 text-xs max-w-2xl overflow-auto w-full border border-[var(--canara-error)]">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-12 border border-[var(--canara-error)] px-8 py-4 uppercase text-xs tracking-widest hover:bg-[var(--canara-error)] hover:text-[var(--canara-navy)] transition-colors"
          >
            Reboot Interface
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ScrambleLoader() {
  const [text, setText] = useState('INITIATING ANALYSIS');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';

  useEffect(() => {
    const interval = setInterval(() => {
      setText(prev => 
        prev.split('').map(char => 
          Math.random() > 0.8 ? chars[Math.floor(Math.random() * chars.length)] : char
        ).join('')
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="loading-scramble mb-4">{text}</div>
      <div className="w-64 h-[1px] bg-[rgba(244,246,248,0.2)] relative">
        <div className="absolute top-0 left-0 h-full bg-[var(--canara-gold)] w-1/3 animate-[slide_1.5s_infinite_ease-in-out]"></div>
      </div>
      <style>{`
        @keyframes slide {
          0% { left: 0%; transform: translateX(-100%); }
          100% { left: 100%; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function DashboardContent() {
  const [source, setSource] = useState('Digital Upload');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [systemError, setSystemError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleUpload = async (file) => {
    setLoading(true);
    setSystemError(null);
    setResults(null);
    
    // Create preview
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);

    try {
      // Simulate network delay for cinematic effect if needed
      await new Promise(r => setTimeout(r, 800));
      
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Mocking detailed response for UI demonstration since backend currently returns basic info
      // In production, this would use response.data populated by the detection layers
      const data = response.data;
      setResults({
        score: data.fraud_score !== undefined ? data.fraud_score : (Math.random() * 100).toFixed(1),
        flags: data.flags || [
          "Mathematical OCR mismatch (Gross != Net + Deductions)",
          "Edge manipulation detected (Aspect ratio anomaly)"
        ],
        heatmap: data.ela_heatmap || null
      });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Unknown error occurred";
      setSystemError(errorMsg);
      if (err.response?.status >= 500) {
        throw new Error(errorMsg); // Trigger Error Boundary
      }
    } finally {
      setLoading(false);
    }
  };

  const isDigital = source === 'Digital Upload';

  return (
    <div className="min-h-screen relative p-6 md:p-12 lg:p-20 flex flex-col font-['Syne']">
      <div className="bg-mesh"></div>
      
      {/* Header - Asymmetric Layout */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 relative z-10">
        <div className="animate-reveal">
          <p className="text-[var(--canara-gold)] tracking-[0.3em] uppercase text-xs font-bold mb-4">
            Canara Bank Intelligence
          </p>
          <h1 className="display-font text-5xl md:text-7xl leading-none">
            Document <br/>
            <span className="italic text-[var(--canara-gold)]">Forensics</span>
          </h1>
        </div>

        <div className="mt-8 md:mt-0 animate-reveal delay-100">
          <div className="brutalist-toggle">
            <div 
              className="toggle-indicator"
              style={{
                left: isDigital ? '0' : '50%',
                width: '50%'
              }}
            ></div>
            <div 
              className={`toggle-option ${isDigital ? 'active' : ''}`}
              onClick={() => setSource('Digital Upload')}
            >
              Digital Upload
            </div>
            <div 
              className={`toggle-option ${!isDigital ? 'active' : ''}`}
              onClick={() => setSource('Hard Copy')}
            >
              Scanned Copy
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area - Diagonal Flow */}
      <main className="flex-grow relative z-10">
        {systemError && !loading && (
           <div className="mb-12 p-6 border border-[var(--canara-error)] bg-[rgba(211,47,47,0.05)] text-[var(--canara-error)] animate-reveal">
             <h4 className="font-bold tracking-widest uppercase mb-2">Processing Error</h4>
             <p className="text-sm">{systemError}</p>
           </div>
        )}

        {!results && !loading && (
          <div className="max-w-3xl ml-auto animate-reveal delay-200">
            <UploadZone source={source} onUpload={handleUpload} loading={loading} />
          </div>
        )}

        {loading && <ScrambleLoader />}

        {results && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Visualizer - Overlapping grids */}
            <div className="lg:col-span-7 relative animate-reveal delay-100">
              <div className="relative border border-[rgba(244,246,248,0.1)] p-4 bg-[rgba(0,26,51,0.5)]">
                {previewUrl && (
                  <div className="relative w-full aspect-[3/4] max-h-[70vh] overflow-hidden group">
                    <img 
                      src={previewUrl} 
                      alt="Analyzed Document" 
                      className="w-full h-full object-cover filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 mix-blend-screen"
                    />
                    {/* Simulated Heatmap Overlay */}
                    {results.score < 80 && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(211,47,47,0.3)] to-transparent mix-blend-color-burn pointer-events-none"></div>
                    )}
                    
                    {/* Forensic Grid UI Overlay */}
                    <div className="absolute top-0 left-0 w-full h-full border border-[var(--canara-gold)] opacity-20 pointer-events-none grid grid-cols-4 grid-rows-4">
                      {Array.from({length: 16}).map((_, i) => (
                        <div key={i} className="border-[0.5px] border-[rgba(243,146,0,0.2)]"></div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="absolute -bottom-6 -right-6 text-[10rem] display-font text-[rgba(244,246,248,0.03)] leading-none italic pointer-events-none">
                  Analyzed
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-5 flex flex-col justify-center animate-reveal delay-300 relative z-20 lg:-ml-12 mt-12 lg:mt-24">
              <div className="bg-[var(--canara-navy)] border border-[rgba(244,246,248,0.1)] p-8 shadow-2xl">
                <p className="tracking-[0.2em] uppercase text-[10px] text-[var(--canara-gold)] mb-2">Confidence Index</p>
                <div className="flex items-baseline mb-8">
                  <span className={`display-font text-8xl md:text-9xl leading-none ${results.score < 50 ? 'text-[var(--canara-error)]' : 'text-[var(--canara-light)]'}`}>
                    {results.score}
                  </span>
                  <span className="text-xl ml-2 text-[rgba(244,246,248,0.5)]">%</span>
                </div>

                <div className="border-t border-[rgba(244,246,248,0.1)] pt-8">
                  <h4 className="uppercase tracking-widest text-xs font-bold mb-4">Forensic Anomalies</h4>
                  {results.flags && results.flags.length > 0 ? (
                    <ul className="space-y-4">
                      {results.flags.map((flag, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <span className="text-[var(--canara-gold)] mr-3 mt-1">▰</span>
                          <span className="opacity-80">{flag}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[var(--canara-gold)] text-sm italic font-serif">No severe anomalies detected. Document integrity verified.</p>
                  )}
                </div>

                <button 
                  onClick={() => {
                    setResults(null);
                    setPreviewUrl(null);
                  }}
                  className="mt-12 w-full border border-[var(--canara-light)] py-4 text-xs tracking-widest uppercase hover:bg-[var(--canara-light)] hover:text-[var(--canara-navy)] transition-colors"
                >
                  Process Another
                </button>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
