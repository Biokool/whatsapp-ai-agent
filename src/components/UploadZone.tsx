"use client";

import { useRef, useState } from "react";
import { UploadCloud, Hourglass } from "lucide-react";

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
            ? "border-ai-green bg-ai-green-low"
            : "border-border hover:border-text-subtle hover:bg-surface-shade"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleChange}
          className="hidden"
        />
        {isUploading ? (
          <Hourglass className="w-8 h-8 mb-2 text-text-faint" />
        ) : (
          <UploadCloud className="w-8 h-8 mb-2 text-text-faint" />
        )}
        <p className="text-sm text-text-subtle">
          {isUploading ? "Procesando archivo..." : "Arrastra un archivo o haz clic para subir"}
        </p>
        <p className="text-xs text-text-faint mt-1">PDF, TXT, MD — Max 10MB</p>
      </div>

      {/* URL Input Toggle */}
      {onAddUrl && (
        <div className="text-center">
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-xs text-ai-green hover:text-ai-green transition-colors"
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
            className="flex-1 bg-surface-shade border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-text-faint focus:outline-none focus:border-focus"
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!urlValue.trim() || isUploading}
            className="bg-ai-green hover:bg-ai-green/85 text-ai-green-contrast text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      )}
    </div>
  );
}
