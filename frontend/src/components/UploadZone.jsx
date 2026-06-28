import React, { useState, useRef } from 'react';

export default function UploadZone({ source, onUpload, loading }) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const VALID_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndUpload = (file) => {
    setError(null);
    if (!file) return;

    if (!VALID_TYPES.includes(file.type)) {
      setError(`Invalid format: ${file.name}. Only PDF, JPEG, and PNG are allowed.`);
      return;
    }

    if (file.size > MAX_SIZE) {
      setError(`File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum is 10MB.`);
      return;
    }

    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="relative">
      {error && (
        <div className="mb-6 p-4 rounded-lg border-2 border-[#D32F2F] bg-[#1a0505] text-[#D32F2F] animate-reveal delay-100 uppercase tracking-widest text-xs font-bold shadow-lg">
          [ ERROR ] {error}
        </div>
      )}

      <form 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onSubmit={(e) => e.preventDefault()}
        className={`relative w-full border-2 border-dashed transition-colors duration-500 min-h-[300px] flex flex-col items-center justify-center p-8 rounded-xl
          ${dragActive ? 'border-[var(--canara-gold)] bg-[rgba(243,146,0,0.05)]' : 'border-[rgba(244,246,248,0.2)] bg-transparent'}
          ${loading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input 
          ref={inputRef}
          type="file" 
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange} 
          className="hidden"
        />

        <div className="text-center z-10">
          <h3 className="display-font text-4xl mb-4 italic text-[var(--canara-light)]">
            Deposit Forensics
          </h3>
          <p className="text-sm tracking-[0.2em] text-[var(--canara-gold)] uppercase mb-8 font-bold">
            Awaiting {source}
          </p>

          <button 
            type="button"
            onClick={() => inputRef.current.click()}
            className="border-2 border-[var(--canara-gold)] text-[var(--canara-gold)] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[var(--canara-gold)] hover:text-[var(--canara-navy)] transition-all transform hover:-translate-y-1 shadow-lg rounded"
          >
            Select Document
          </button>
        </div>

        {/* Decorative Grid Lines */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-[var(--canara-light)] opacity-30 rounded-tl"></div>
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-[var(--canara-light)] opacity-30 rounded-tr"></div>
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-[var(--canara-light)] opacity-30 rounded-bl"></div>
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-[var(--canara-light)] opacity-30 rounded-br"></div>
      </form>
    </div>
  );
}
