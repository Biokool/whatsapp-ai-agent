"use client";

import { useRef, useState } from "react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  onAddUrl?: (url: string) => void;
  isUploading: boolean;
}

export default function UploadZone({ onUpload, onAddUrl, isUploading }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  }

  function handleUrlSubmit() {
    if (urlValue.trim() && onAddUrl) {
      onAddUrl(urlValue.trim());
      setUrlValue("");
      setShowUrlInput(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* File Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-ai-green-light bg-ai-green/10"
            : "border-navy-500 hover:border-navy-400 hover:bg-navy-700/50"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleChange}
          className="hidden"
        />
        <span className="material-symbols-outlined text-3xl text-navy-400 mb-2">
          {isUploading ? "hourglass_top" : "upload_file"}
        </span>
        <p className="text-sm text-navy-300">
          {isUploading ? "Procesando archivo..." : "Arrastra un archivo o haz clic para subir"}
        </p>
        <p className="text-xs text-navy-400 mt-1">PDF, TXT, MD — Max 10MB</p>
      </div>

      {/* URL Input Toggle */}
      {onAddUrl && (
        <div className="text-center">
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-xs text-ai-green-light hover:text-ai-green transition-colors"
          >
            {showUrlInput ? "Cancelar" : "+ Agregar desde URL"}
          </button>
        </div>
      )}

      {/* URL Input Form */}
      {showUrlInput && onAddUrl && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://ejemplo.com/documentacion"
            className="flex-1 bg-navy-900 border border-navy-500 rounded-lg px-3 py-2 text-sm text-navy-200 placeholder-navy-400 focus:outline-none focus:border-ai-green-light"
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!urlValue.trim() || isUploading}
            className="bg-ai-green hover:bg-ai-green-light text-ai-green-dark text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      )}
    </div>
  );
}
