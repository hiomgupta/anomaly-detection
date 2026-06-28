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
  const steps = [
    'INITIATING SECURE CONNECTION',
    'EXTRACTING DOCUMENT METADATA',
    'RUNNING STRUCTURAL FORENSICS',
    'ANALYZING PIXEL NOISE (ELA)',
    'EXECUTING OCR LOGIC CHECKS',
    'CALCULATING FRAUD INDEX'
  ];
  const [stepIdx, setStepIdx] = useState(0);
  const [text, setText] = useState(steps[0]);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';

  // Step progression
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx(prev => Math.min(prev + 1, steps.length - 1));
    }, 1500); // 1.5s per step
    return () => clearInterval(interval);
  }, [steps.length]);

  // Scramble effect for new text
  useEffect(() => {
    const target = steps[stepIdx];
    const startTime = Date.now();
    const duration = 800;
    
    const scrambleInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setText(target.split('').map((char) => {
        if (char === ' ') return ' ';
        return Math.random() < progress ? char : chars[Math.floor(Math.random() * chars.length)];
      }).join(''));
      
      if (progress === 1) clearInterval(scrambleInterval);
    }, 40);
    
    return () => clearInterval(scrambleInterval);
  }, [stepIdx]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="text-[var(--canara-gold)] text-[10px] mb-2 tracking-[0.3em] uppercase">Procedure {stepIdx + 1}/{steps.length}</div>
      <div className="loading-scramble mb-4 text-center min-w-[300px] h-8">{text}</div>
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
  const [documentCategory, setDocumentCategory] = useState('General');
  const [isSigned, setIsSigned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [systemError, setSystemError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const handleReviewDecision = async (action) => {
    setReviewLoading(true);
    try {
      await axios.post(`http://localhost:8000/document/${results.document_id}/review`, { action });
      setResults(prev => ({ ...prev, status: action === 'approve' ? 'verified_override' : 'rejected' }));
    } catch (err) {
      alert("Failed to submit review. Server might be unreachable.");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleUpload = async (file) => {
    setLoading(true);
    setSystemError(null);
    setResults(null);

    // Create preview
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setFileType(file.type);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);
    formData.append('document_category', documentCategory);
    formData.append('is_signed', isSigned.toString());

    try {
      // Run the upload request and the cinematic delay concurrently
      const uploadPromise = axios.post('http://localhost:8000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const delayPromise = new Promise(r => setTimeout(r, 8500));

      const [response] = await Promise.all([uploadPromise, delayPromise]);

      const data = response.data;
      setResults({
        document_id: data.document_id,
        score: data.fraud_score !== undefined ? Number(data.fraud_score).toFixed(1) : '0.0',
        flags: data.flags || [],
        notes: data.notes || [],
        scores: data.scores || {},
        status: data.status || 'processed',
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
            Kanara Bank Intelligence
          </p>
          <h1 className="display-font text-5xl md:text-7xl leading-none">
            Document <br />
            <span className="italic text-[var(--canara-gold)]">Forensics</span>
          </h1>
        </div>

      </header>

      {/* Main Content Area - Diagonal Flow */}
      <main className="flex-grow relative z-10">
        {systemError && !loading && (
          <div className="mb-12 p-6 rounded-lg border-2 border-[var(--canara-error)] bg-[rgba(211,47,47,0.05)] text-[var(--canara-error)] animate-reveal shadow-lg">
            <h4 className="font-bold tracking-widest uppercase mb-2">Processing Error</h4>
            <p className="text-sm">{systemError}</p>
          </div>
        )}

        {!results && !loading && (
          <div className="max-w-4xl ml-auto animate-reveal delay-200">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Professional Segmented Control Toggle */}
              <div className="flex bg-[rgba(244,246,248,0.05)] border border-[rgba(244,246,248,0.2)] p-1 w-full md:w-1/3 rounded-lg">
                <button
                  onClick={() => setSource('Digital Upload')}
                  className={`flex-1 text-xs uppercase tracking-widest py-2 px-2 transition-all duration-300 rounded-md ${isDigital ? 'bg-[var(--canara-gold)] text-[var(--canara-navy)] font-bold shadow-lg' : 'text-[rgba(244,246,248,0.6)] hover:text-[var(--canara-light)]'}`}
                >
                  Digital Upload
                </button>
                <button
                  onClick={() => setSource('Hard Copy')}
                  className={`flex-1 text-xs uppercase tracking-widest py-2 px-2 transition-all duration-300 rounded-md ${!isDigital ? 'bg-[var(--canara-gold)] text-[var(--canara-navy)] font-bold shadow-lg' : 'text-[rgba(244,246,248,0.6)] hover:text-[var(--canara-light)]'}`}
                >
                  Scanned Copy
                </button>
              </div>

              <select 
                value={documentCategory}
                onChange={(e) => setDocumentCategory(e.target.value)}
                className="bg-transparent border border-[rgba(244,246,248,0.2)] text-[var(--canara-light)] p-3 outline-none focus:border-[var(--canara-gold)] w-full md:w-1/3 uppercase tracking-widest text-xs rounded-lg transition-colors"
              >
                <option value="General" className="bg-[var(--canara-navy)]">General Document</option>
                <option value="Cheque" className="bg-[var(--canara-navy)]">Cheque</option>
                <option value="AOD Doc" className="bg-[var(--canara-navy)]">AOD Document</option>
                <option value="PAN/Aadhaar" className="bg-[var(--canara-navy)]">PAN / Aadhaar</option>
                <option value="Agreement" className="bg-[var(--canara-navy)]">Agreement / Lease</option>
                <option value="ITR" className="bg-[var(--canara-navy)]">ITR / Tax Form</option>
                <option value="Pay Slip" className="bg-[var(--canara-navy)]">Pay Slip</option>
              </select>
              <label className="flex items-center gap-3 cursor-pointer bg-transparent border border-[rgba(244,246,248,0.2)] p-3 w-full md:w-1/3 hover:border-[var(--canara-gold)] transition-colors rounded-lg">
                <input 
                  type="checkbox" 
                  checked={isSigned}
                  onChange={(e) => setIsSigned(e.target.checked)}
                  className="accent-[var(--canara-gold)] w-4 h-4 cursor-pointer"
                />
                <span className="uppercase tracking-widest text-xs text-[var(--canara-light)]">Contains Signature</span>
              </label>
            </div>
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
                  <div className="relative w-full aspect-[3/4] max-h-[70vh] overflow-hidden group bg-white/5 rounded-sm">
                    {fileType === 'application/pdf' ? (
                      <iframe 
                        src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                        title="Analyzed Document"
                        className="w-full h-full border-0 filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 mix-blend-screen pointer-events-none"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Analyzed Document"
                        className="w-full h-full object-cover filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 mix-blend-screen"
                      />
                    )}
                    {/* Simulated Heatmap Overlay */}
                    {results.score < 80 && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(211,47,47,0.3)] to-transparent mix-blend-color-burn pointer-events-none"></div>
                    )}

                    {/* Forensic Grid UI Overlay */}
                    <div className="absolute top-0 left-0 w-full h-full border border-[var(--canara-gold)] opacity-20 pointer-events-none grid grid-cols-4 grid-rows-4">
                      {Array.from({ length: 16 }).map((_, i) => (
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
              <div className="bg-[var(--canara-navy)] border border-[rgba(244,246,248,0.1)] p-8 shadow-2xl rounded-xl">
                
                {/* 1. Status & Hierarchy Redesign */}
                <div className="border-b border-[rgba(244,246,248,0.1)] pb-6 mb-6">
                  {results.score >= 80 ? (
                    <div className="text-green-500 font-bold uppercase tracking-widest text-2xl md:text-3xl flex items-center gap-3 mb-2">
                      <span>✓</span> VERIFIED AUTHENTIC
                    </div>
                  ) : (
                    <div className="text-[var(--canara-error)] font-bold uppercase tracking-widest text-2xl md:text-3xl flex items-center gap-3 mb-2">
                      <span>⚠️</span> TAMPERING DETECTED
                    </div>
                  )}
                  
                  <div className="flex justify-between items-end mt-6">
                    <div>
                      <p className="text-[10px] text-[rgba(244,246,248,0.5)] uppercase tracking-widest mb-1">Manipulation Risk</p>
                      <p className={`font-bold text-lg uppercase ${results.score >= 80 ? 'text-green-400' : 'text-[var(--canara-error)]'}`}>
                        {results.score >= 90 ? 'Very Low' : results.score >= 80 ? 'Low' : results.score >= 60 ? 'High' : 'Critical'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[rgba(244,246,248,0.5)] uppercase tracking-widest mb-1">Authenticity Score</p>
                      <p className="display-font text-3xl text-[var(--canara-light)]">
                        {Number(results.score).toFixed(0)} <span className="text-base text-[rgba(244,246,248,0.4)]">/ 100</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Human in the loop controls */}
                {results.status === 'flagged' && (
                  <div className="mb-6 border border-[#ff0000] p-6 bg-[rgba(255,0,0,0.05)] w-full rounded-sm">
                    <div className="text-[var(--canara-error)] text-sm font-bold uppercase tracking-widest mb-6">
                      ⚠️ Requires Manual Underwriter Review
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                      <button 
                        onClick={() => handleReviewDecision('approve')}
                        disabled={reviewLoading}
                        className="flex-1 bg-green-600 text-white py-5 px-2 text-sm md:text-base uppercase font-bold tracking-widest hover:bg-green-500 transition-all transform hover:-translate-y-1 hover:shadow-lg rounded"
                      >
                        {reviewLoading ? 'Processing...' : 'Approve (Override)'}
                      </button>
                      <button 
                        onClick={() => handleReviewDecision('reject')}
                        disabled={reviewLoading}
                        className="flex-1 bg-red-600 text-white py-5 px-2 text-sm md:text-base uppercase font-bold tracking-widest hover:bg-red-500 transition-all transform hover:-translate-y-1 hover:shadow-lg rounded"
                      >
                        {reviewLoading ? 'Processing...' : 'Reject Document'}
                      </button>
                    </div>
                  </div>
                )}
                {results.status === 'verified_override' && (
                  <div className="mb-6 bg-yellow-600 text-white px-6 py-4 text-sm font-bold uppercase tracking-widest border border-yellow-400 w-full rounded-sm">
                    ✅ Approved by Underwriter
                  </div>
                )}
                {results.status === 'rejected' && (
                  <div className="mb-6 bg-red-900 text-white px-6 py-4 text-sm font-bold uppercase tracking-widest border border-red-500 w-full rounded-sm">
                    ❌ Rejected by Underwriter
                  </div>
                )}

                {/* 2. Checks Performed Summary */}
                <div className="mb-8">
                  <p className="tracking-[0.2em] uppercase text-[10px] text-[var(--canara-gold)] mb-4 font-bold">Checks Performed</p>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    {results.scores && Object.entries(results.scores).map(([name, value]) => {
                       const isPass = Number(value) >= 80;
                       let displayName = name.toUpperCase().replace('_', ' ');
                       if (name === 'metadata') displayName = 'EXIF FORENSIC';
                       return (
                         <div key={`summary-${name}`} className="flex items-center gap-2">
                           {isPass ? (
                             <span className="text-green-500">✓</span>
                           ) : (
                             <span className="text-[var(--canara-error)]">⚠️</span>
                           )}
                           <span className={isPass ? 'text-[var(--canara-light)]' : 'text-[var(--canara-error)] font-bold'}>{displayName}</span>
                         </div>
                       )
                    })}
                  </div>
                </div>

                {/* 3. Detailed Metrics with Progress Bars */}
                <div className="border-t border-[rgba(244,246,248,0.1)] pt-8 space-y-6">
                  {results.scores && Object.keys(results.scores).length > 0 && (
                    <details className="group border border-[rgba(244,246,248,0.12)] rounded-lg p-6 open:bg-[rgba(244,246,248,0.02)] transition-colors cursor-pointer">
                      <summary className="flex justify-between items-center font-bold list-none text-[var(--canara-light)] uppercase tracking-widest text-sm outline-none">
                        <span>🔍 Detailed Metrics</span>
                        <span className="transition-transform duration-300 group-open:rotate-180">
                          <svg fill="none" height="24" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                        </span>
                      </summary>
                      <div className="mt-8 space-y-8 cursor-default">
                        {Object.entries(results.scores).map(([name, value]) => {
                          const numValue = Number(value);
                          const isPass = numValue >= 80;
                          
                          const SCORE_DETAILS = {
                            ela: { name: 'ELA Analysis', passMsg: 'No compression anomalies detected', failMsg: 'Inconsistent compression detected (potential cloning)' },
                            edge: { name: 'Edge Detection', passMsg: 'No structural splicing detected', failMsg: 'Sharp unnatural boundaries detected' },
                            copy_move: { name: 'Copy-Move', passMsg: 'No cloned regions found', failMsg: 'Identical pixel regions detected' },
                            pdf: { name: 'PDF Forensics', passMsg: 'Standard document structure', failMsg: 'Suspicious PDF editor metadata found' },
                            ocr: { name: 'OCR & Logic', passMsg: 'Text and math logically consistent', failMsg: 'Inconsistencies in extracted text logic' },
                            signature: { name: 'Signature Forensics', passMsg: 'Signature strokes appear natural', failMsg: 'Potential digital tracing detected' },
                            metadata: { name: 'EXIF Forensics', passMsg: 'No editing software signatures found', failMsg: 'Editing software / modified dates detected' }
                          };
                          const details = SCORE_DETAILS[name] || { name: name.toUpperCase(), passMsg: 'Check passed', failMsg: 'Check failed or flagged' };
                          
                          return (
                            <div key={`detail-${name}`} className="relative">
                              <div className="flex justify-between items-end mb-2">
                                <p className="uppercase tracking-widest text-xs font-bold text-[var(--canara-gold)]">{details.name}</p>
                                <p className={`display-font text-xl ${isPass ? 'text-[var(--canara-light)]' : 'text-[var(--canara-error)]'}`}>{numValue.toFixed(0)}%</p>
                              </div>
                              {/* Progress bar */}
                              <div className="w-full bg-[rgba(244,246,248,0.1)] h-1.5 rounded overflow-hidden mb-2">
                                <div 
                                  className={`h-full ${isPass ? 'bg-[var(--canara-light)]' : 'bg-[var(--canara-error)]'}`} 
                                  style={{ width: `${Math.max(5, numValue)}%` }}
                                ></div>
                              </div>
                              {/* Meaningful text */}
                              <p className={`text-[10px] uppercase tracking-widest flex items-center gap-1.5 ${isPass ? 'text-[rgba(244,246,248,0.5)]' : 'text-[var(--canara-error)] opacity-90'}`}>
                                {isPass ? (
                                  <><span>✓</span> Passed: {details.passMsg}</>
                                ) : (
                                  <><span>⚠️</span> Warning: {details.failMsg}</>
                                )}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                  
                  {results.notes && results.notes.length > 0 && (
                    <div className="mt-4 p-5 rounded bg-[rgba(244,246,248,0.02)] border border-[rgba(244,246,248,0.05)] text-xs text-[rgba(244,246,248,0.5)] leading-relaxed">
                      <p className="uppercase tracking-widest font-bold text-[10px] text-[var(--canara-gold)] mb-3">System Notes</p>
                      <ul className="space-y-2">
                        {results.notes.map((note, idx) => (
                          <li key={idx} className="flex gap-2"><span className="text-[var(--canara-gold)] opacity-50">-</span> {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-12 flex flex-col xl:flex-row gap-4 w-full">
                  <a
                    href={`http://localhost:8000/document/${results.document_id}/report`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-[var(--canara-gold)] text-[var(--canara-navy)] text-center font-bold py-5 px-4 text-sm tracking-widest uppercase hover:bg-white hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center rounded"
                  >
                    Download Official Report
                  </a>
                  <button
                    onClick={() => {
                      setResults(null);
                      setPreviewUrl(null);
                      setFileType(null);
                    }}
                    className="flex-1 border-2 border-[var(--canara-light)] text-[var(--canara-light)] py-5 px-4 text-sm tracking-widest uppercase hover:bg-[var(--canara-light)] hover:text-[var(--canara-navy)] hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center rounded"
                  >
                    Process Another
                  </button>
                </div>
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
