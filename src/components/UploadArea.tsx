import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Shield, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  onUpload: (file: File) => void;
  isProcessing: boolean;
}

export function UploadArea({ onUpload, isProcessing }: UploadAreaProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      if (acceptedFiles.length === 0) return;
      
      const file = acceptedFiles[0];
      // Basic validation
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError("File is too large. Max 10MB.");
        return;
      }
      
      onUpload(file);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    disabled: isProcessing,
    maxFiles: 1,
  } as any);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={cn(
          "border border-dashed rounded-none p-16 text-center transition-all duration-300 ease-in-out cursor-pointer bg-white",
          isDragActive
            ? "border-slate-900 bg-slate-50"
            : "border-stone-300 hover:border-slate-400 hover:bg-slate-50/50",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-6">
          {isProcessing ? (
            <Loader2 className="h-10 w-10 text-slate-800 animate-spin" strokeWidth={1.5} />
          ) : (
            <Shield className="h-12 w-12 text-slate-800" strokeWidth={1} />
          )}
          
          <div className="space-y-2">
            <h3 className="font-serif text-2xl text-slate-900">
              {isProcessing ? "Analyzing Document..." : "Secure Document Portal"}
            </h3>
            <p className="font-sans text-sm text-slate-500 max-w-md mx-auto tracking-wide leading-relaxed">
              {isProcessing
                ? "Our proprietary models are extracting and categorizing your transactions."
                : "Drag & drop your PDF, Excel, CSV, or image scan here, or click to browse your files."}
            </p>
          </div>

          {!isProcessing && (
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-6 uppercase tracking-widest font-semibold">
              <FileText className="h-4 w-4" />
              <span>Supports PDF, CSV, XLSX, JPG, PNG (Max 10MB)</span>
            </div>
          )}
        </div>
      </div>
      {error && (
        <p className="text-red-500 text-sm text-center mt-4 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
