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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await axios.post(`${apiUrl}/document/${results.document_id}/review`, { action });
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const uploadPromise = axios.post(`${apiUrl}/upload`, formData, {
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
        heatmap: data.ela_heatmap || null,
        reason_codes: data.reason_codes || [],
        anomaly_score: data.anomaly_score ?? null,
        file_hash: data.file_hash || null,
      });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Unknown error occurred";
      setSystemError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const isDigital = source === 'Digital Upload';

  const SCORE_META = {
    ela: { label: 'Error Level Analysis', passMsg: 'No compression anomalies', failMsg: 'Compression inconsistency detected' },
    edge: { label: 'Edge Detection', passMsg: 'No structural splicing', failMsg: 'Unnatural boundaries detected' },
    copy_move: { label: 'Copy-Move Detection', passMsg: 'No cloned regions found', failMsg: 'Cloned pixel regions detected' },
    pdf: { label: 'PDF Structure', passMsg: 'Standard document structure', failMsg: 'Suspicious PDF editor metadata' },
    ocr: { label: 'OCR Analysis', passMsg: 'Text logic consistent', failMsg: 'OCR inconsistencies detected' },
    signature: { label: 'Signature', passMsg: 'Signature appears natural', failMsg: 'Signature could not be verified' },
    metadata: { label: 'EXIF Forensics', passMsg: 'No editing software found', failMsg: 'Editing software / date mismatch' },
  };

  const scoreVal = results ? Number(results.score) : 0;
  const riskLabel = scoreVal >= 90 ? 'Very Low' : scoreVal >= 80 ? 'Low' : scoreVal >= 60 ? 'High' : 'Critical';
  const isAuthentic = scoreVal >= 80;
  const failedChecks = results ? Object.entries(results.scores || {}).filter(([, v]) => v !== null && Number(v) < 80) : [];
  const reviewReasons = results ? [
    ...failedChecks.map(([k]) => SCORE_META[k]?.failMsg || k),
    ...(results.flags || []),
    ...(results.reason_codes || []).filter(r => r.startsWith('HIGH')),
  ] : [];

  // Colours
  const green = '#22c55e';
  const amber = '#f59e0b';
  const red = '#ef4444';
  const neutral = 'rgba(244,246,248,0.55)';

  // ── Dedicated Error View ───────────────────────────────────────────────────
  if (systemError && !loading && !results) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-['Syne']" style={{ background: 'var(--canara-navy)' }}>
        <div className="bg-mesh"></div>
        <div className="z-10 p-8 rounded-lg max-w-lg text-center backdrop-blur-md shadow-[0_0_40px_rgba(239,68,68,0.2)]" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div className="text-red-500 text-5xl mb-6">⚠</div>
          <h2 className="text-xl text-red-500 font-bold tracking-widest uppercase mb-4">Processing Error</h2>
          <p className="text-red-400/80 mb-8 leading-relaxed text-sm">
            The system encountered an error while analyzing the document:
            <br/><br/>
            <strong className="text-red-400">{systemError}</strong>
          </p>
          <button 
            onClick={() => setSystemError(null)}
            className="px-8 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-500 rounded uppercase tracking-widest text-xs font-bold transition-all"
          >
            Acknowledge & Return
          </button>
        </div>
      </div>
    );
  }

  if (!results && !loading) {
    return (
      <div className="min-h-screen relative p-6 md:p-12 lg:p-20 flex flex-col font-['Syne']">
        <div className="bg-mesh"></div>
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 relative z-10">
          <div className="animate-reveal">
            <p className="text-[var(--canara-gold)] tracking-[0.3em] uppercase text-xs font-bold mb-4">Kanara Bank Intelligence</p>
            <h1 className="display-font text-5xl md:text-7xl leading-none">
              Document <br />
              <span className="italic text-[var(--canara-gold)]">Forensics</span>
            </h1>
          </div>
        </header>
        <main className="flex-grow relative z-10">
          <div className="max-w-4xl ml-auto animate-reveal delay-200">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex bg-[rgba(244,246,248,0.05)] border border-[rgba(244,246,248,0.2)] p-1 w-full md:w-1/3 rounded-lg">
                <button onClick={() => setSource('Digital Upload')} className={`flex-1 text-xs uppercase tracking-widest py-2 px-2 transition-all duration-300 rounded-md ${isDigital ? 'bg-[var(--canara-gold)] text-[var(--canara-navy)] font-bold shadow-lg' : 'text-[rgba(244,246,248,0.6)] hover:text-[var(--canara-light)]'}`}>Digital Upload</button>
                <button onClick={() => setSource('Hard Copy')} className={`flex-1 text-xs uppercase tracking-widest py-2 px-2 transition-all duration-300 rounded-md ${!isDigital ? 'bg-[var(--canara-gold)] text-[var(--canara-navy)] font-bold shadow-lg' : 'text-[rgba(244,246,248,0.6)] hover:text-[var(--canara-light)]'}`}>Scanned Copy</button>
              </div>
              <select value={documentCategory} onChange={(e) => setDocumentCategory(e.target.value)} className="bg-transparent border border-[rgba(244,246,248,0.2)] text-[var(--canara-light)] p-3 outline-none focus:border-[var(--canara-gold)] w-full md:w-1/3 uppercase tracking-widest text-xs rounded-lg transition-colors">
                <option value="General" className="bg-[var(--canara-navy)]">General Document</option>
                <option value="Cheque" className="bg-[var(--canara-navy)]">Cheque</option>
                <option value="AOD Doc" className="bg-[var(--canara-navy)]">AOD Document</option>
                <option value="PAN/Aadhaar" className="bg-[var(--canara-navy)]">PAN / Aadhaar</option>
                <option value="Agreement" className="bg-[var(--canara-navy)]">Agreement / Lease</option>
                <option value="ITR" className="bg-[var(--canara-navy)]">ITR / Tax Form</option>
                <option value="Pay Slip" className="bg-[var(--canara-navy)]">Pay Slip</option>
              </select>
              <label className="flex items-center gap-3 cursor-pointer bg-transparent border border-[rgba(244,246,248,0.2)] p-3 w-full md:w-1/3 hover:border-[var(--canara-gold)] transition-colors rounded-lg">
                <input type="checkbox" checked={isSigned} onChange={(e) => setIsSigned(e.target.checked)} className="accent-[var(--canara-gold)] w-4 h-4 cursor-pointer" />
                <span className="uppercase tracking-widest text-xs text-[var(--canara-light)]">Contains Signature</span>
              </label>
            </div>
            <UploadZone source={source} onUpload={handleUpload} loading={loading} />
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-['Syne']">
        <div className="bg-mesh"></div>
        <ScrambleLoader />
      </div>
    );
  }

  // ── Enterprise Results Layout ──────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col font-['Syne'] overflow-hidden" style={{ background: 'var(--canara-navy)' }}>
      <div className="bg-mesh"></div>

      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <header style={{
        borderBottom: '1px solid rgba(244,246,248,0.1)',
        background: 'rgba(0,26,51,0.95)',
        backdropFilter: 'blur(12px)',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexShrink: 0,
        position: 'relative',
        zIndex: 20,
      }}>
        {/* Left: Brand + filename */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', overflow: 'hidden' }}>
          <span style={{ color: 'var(--canara-gold)', fontWeight: 700, fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            KB Intelligence
          </span>
          <span style={{ color: 'rgba(244,246,248,0.2)', fontSize: '16px' }}>|</span>
          <span style={{ color: 'rgba(244,246,248,0.6)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
            {results?.filename || 'Document Analysis'}
          </span>
          {results?.file_hash && (
            <span style={{ color: 'rgba(244,246,248,0.25)', fontSize: '10px', fontFamily: 'monospace', display: 'none' }} className="xl:inline">
              SHA-256: {results.file_hash.slice(0, 16)}…
            </span>
          )}
        </div>

        {/* Right: Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {results?.status === 'flagged' && (
            <>
              <button
                onClick={() => handleReviewDecision('approve')}
                disabled={reviewLoading}
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', color: green, padding: '8px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {reviewLoading ? '…' : 'Approve Override'}
              </button>
              <button
                onClick={() => handleReviewDecision('reject')}
                disabled={reviewLoading}
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: red, padding: '8px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {reviewLoading ? '…' : 'Reject Document'}
              </button>
            </>
          )}
          {results?.status === 'verified_override' && (
            <span style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', color: green, padding: '8px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', borderRadius: '6px' }}>
              ✓ Approved by Underwriter
            </span>
          )}
          {results?.status === 'rejected' && (
            <span style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: red, padding: '8px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', borderRadius: '6px' }}>
              ✕ Rejected
            </span>
          )}
          <a
            href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/document/${results?.document_id}/report`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: 'var(--canara-gold)', color: 'var(--canara-navy)', padding: '8px 20px', fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', borderRadius: '6px', textDecoration: 'none', transition: 'all 0.2s' }}
          >
            Download Report
          </a>
          <button
            onClick={() => { setResults(null); setPreviewUrl(null); setFileType(null); }}
            style={{ background: 'transparent', border: '1px solid rgba(244,246,248,0.2)', color: 'rgba(244,246,248,0.7)', padding: '8px 16px', fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Analyze Another
          </button>
        </div>
      </header>

      {/* ── Two-Panel Body ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR: Fixed Inspection Summary ────────────────────────── */}
        <aside style={{
          width: '380px',
          flexShrink: 0,
          borderRight: '1px solid rgba(244,246,248,0.08)',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: 'rgba(0,10,20,0.6)',
          display: 'flex',
          flexDirection: 'column',
        }}>

          {/* ── Section 1: Overall Status ───────────────────────────────────── */}
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(244,246,248,0.08)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(244,246,248,0.4)', marginBottom: '16px' }}>
              Verification Summary
            </p>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <span style={{ fontSize: '20px' }}>{isAuthentic ? '✓' : '⚠'}</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: isAuthentic ? green : red, letterSpacing: '1px', textTransform: 'uppercase' }}>
                {isAuthentic ? 'Verified Authentic' : 'Tampering Detected'}
              </span>
            </div>

            {/* Score / Risk / Decision grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(244,246,248,0.04)', borderRadius: '8px', padding: '12px' }}>
                <p style={{ fontSize: '10px', color: 'rgba(244,246,248,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Overall Score</p>
                <p style={{ fontSize: '32px', fontWeight: 800, color: isAuthentic ? green : red, lineHeight: 1 }}>
                  {Number(results.score).toFixed(0)}
                  <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(244,246,248,0.4)' }}> / 100</span>
                </p>
              </div>
              <div style={{ background: 'rgba(244,246,248,0.04)', borderRadius: '8px', padding: '12px' }}>
                <p style={{ fontSize: '10px', color: 'rgba(244,246,248,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Risk Level</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: scoreVal >= 80 ? green : scoreVal >= 60 ? amber : red }}>
                  {riskLabel}
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1', background: 'rgba(244,246,248,0.04)', borderRadius: '8px', padding: '12px' }}>
                <p style={{ fontSize: '10px', color: 'rgba(244,246,248,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Decision</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: results.status === 'flagged' ? amber : results.status === 'verified_override' ? green : results.status === 'rejected' ? red : 'rgba(244,246,248,0.8)' }}>
                  {results.status === 'flagged' ? 'Manual Review Required' :
                    results.status === 'verified_override' ? 'Approved by Underwriter' :
                      results.status === 'rejected' ? 'Rejected by Underwriter' : 'Verified — No Review Needed'}
                </p>
              </div>
              {/* Anomaly score if available */}
              {results.anomaly_score !== null && results.anomaly_score !== undefined && (
                <div style={{ gridColumn: '1 / -1', background: 'rgba(244,246,248,0.03)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '10px', color: 'rgba(244,246,248,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>ML Anomaly Score</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: results.anomaly_score >= 70 ? green : results.anomaly_score >= 40 ? amber : red }}>
                    {Number(results.anomaly_score).toFixed(1)} / 100
                  </p>
                </div>
              )}
            </div>
          </div>


          {/* ── Section 3: Reason for Review ───────────────────────────────── */}
          {reviewReasons.length > 0 && (
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(244,246,248,0.08)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(244,246,248,0.4)', marginBottom: '12px' }}>
                Reason for Review
              </p>
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{ color: amber, fontSize: '13px' }}>⚠</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: amber }}>Review Required</span>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {reviewReasons.map((r, i) => (
                    <li key={i} style={{ fontSize: '12px', color: 'rgba(244,246,248,0.65)', display: 'flex', gap: '8px' }}>
                      <span style={{ color: amber, flexShrink: 0 }}>•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ── Section 2: Authentication Checks ───────────────────────────── */}
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(244,246,248,0.08)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(244,246,248,0.4)', marginBottom: '16px' }}>
              Authentication
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {results.scores && Object.entries(results.scores)
                .filter(([, v]) => v !== null && v !== undefined)
                .map(([key, val]) => {
                  const numVal = Number(val);
                  const pass = numVal >= 80;
                  const meta = SCORE_META[key] || { label: key };
                  const barPct = Math.max(3, numVal);
                  const barColor = pass ? green : numVal >= 50 ? amber : red;
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid rgba(244,246,248,0.04)' }}>
                      <span style={{ fontSize: '13px', width: '16px', textAlign: 'center', flexShrink: 0, color: pass ? green : amber }}>
                        {pass ? '✓' : '⚠'}
                      </span>
                      <span style={{ flex: 1, fontSize: '13px', color: pass ? 'rgba(244,246,248,0.8)' : 'rgba(244,246,248,0.9)', fontWeight: pass ? 400 : 500 }}>
                        {meta.label}
                      </span>
                      <div style={{ width: '60px', height: '4px', background: 'rgba(244,246,248,0.08)', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ width: `${barPct}%`, height: '100%', background: barColor, borderRadius: '2px', transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: pass ? 'rgba(244,246,248,0.7)' : barColor, width: '28px', textAlign: 'right', flexShrink: 0 }}>
                        {numVal.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>


          {/* ── Section 4: Detailed Metrics ─────────────────────────────────── */}
          <div style={{ padding: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(244,246,248,0.4)', marginBottom: '16px' }}>
              Detailed Metrics
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {results.scores && Object.entries(results.scores)
                .filter(([, v]) => v !== null && v !== undefined)
                .map(([key, val]) => {
                  const numVal = Number(val);
                  const pass = numVal >= 80;
                  const meta = SCORE_META[key] || { label: key, passMsg: 'Passed', failMsg: 'Failed' };
                  const valueColor = pass ? neutral : numVal >= 50 ? amber : red;
                  return (
                    <div key={`dm-${key}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(244,246,248,0.05)' }}>
                      <span style={{ fontSize: '13px', color: 'rgba(244,246,248,0.5)', fontWeight: 400 }}>{meta.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: valueColor, textAlign: 'right', maxWidth: '140px' }}>
                        {numVal >= 80 ? meta.passMsg : `${numVal.toFixed(0)}% (${meta.failMsg})`}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Notes */}
            {results.notes && results.notes.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(244,246,248,0.03)', borderRadius: '6px', border: '1px solid rgba(244,246,248,0.06)' }}>
                <p style={{ fontSize: '10px', color: 'rgba(244,246,248,0.3)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', fontWeight: 700 }}>System Notes</p>
                {results.notes.map((n, i) => (
                  <p key={i} style={{ fontSize: '11px', color: 'rgba(244,246,248,0.4)', lineHeight: 1.6 }}>— {n}</p>
                ))}
              </div>
            )}

            {/* SHA-256 */}
            {results.file_hash && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(244,246,248,0.06)' }}>
                <p style={{ fontSize: '9px', color: 'rgba(244,246,248,0.25)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px', fontWeight: 700 }}>SHA-256 Fingerprint</p>
                <p style={{ fontSize: '8px', fontFamily: 'monospace', color: 'rgba(244,246,248,0.2)', wordBreak: 'break-all', lineHeight: 1.6 }}>{results.file_hash}</p>
              </div>
            )}
          </div>
        </aside>

        {/* ── RIGHT PANEL: Document Viewer ──────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(0,5,12,0.7)' }}>
          {/* Toolbar strip */}
          <div style={{ height: '44px', borderBottom: '1px solid rgba(244,246,248,0.07)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '12px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: 'rgba(244,246,248,0.3)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Document Preview</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: '11px', color: 'rgba(244,246,248,0.25)' }}>ID #{results?.document_id}</span>
          </div>

          {/* Document viewer body */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px', position: 'relative' }}>
            {/* Forensic grid overlay hint */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(243,146,0,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(243,146,0,0.015) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

            {previewUrl ? (
              <div style={{ width: '100%', maxWidth: '680px', position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', borderRadius: '4px', overflow: 'hidden' }}>
                {/* Red heatmap tint for flagged docs */}
                {!isAuthentic && (
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, transparent 60%)', zIndex: 2, pointerEvents: 'none', borderRadius: '4px' }} />
                )}
                {/* Forensic scan line animation */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(243,146,0,0.6), transparent)', zIndex: 3, animation: 'scanLine 3s linear infinite', pointerEvents: 'none' }} />
                <style>{`@keyframes scanLine { 0% { top: 0; opacity: 1; } 95% { top: 100%; opacity: 1; } 100% { top: 100%; opacity: 0; } }`}</style>

                {fileType === 'application/pdf' ? (
                  <iframe
                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    title="Document Preview"
                    style={{ width: '100%', minHeight: '80vh', border: 'none', display: 'block', background: '#fff' }}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Document Preview"
                    style={{ width: '100%', minHeight: '400px', maxHeight: '85vh', display: 'block', objectFit: 'contain', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}
                  />
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(244,246,248,0.2)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '12px' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
                <p style={{ fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase' }}>No preview available</p>
              </div>
            )}
          </div>
        </main>
      </div>
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
