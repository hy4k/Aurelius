import React, { useState } from "react";
import { UploadArea } from "./components/UploadArea";
import { Dashboard } from "./components/Dashboard";
import { parseStatement, ParseResult } from "./services/geminiService";
import { FileText, RefreshCw, ShieldCheck, Landmark } from "lucide-react";
import { Button } from "./components/ui/button";

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await parseStatement(file);
      setData(result);
    } catch (err) {
      console.error(err);
      setError("Failed to process the statement. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-slate-900 font-sans selection:bg-[#b89768]/20 selection:text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-[#F9F8F6]/90 backdrop-blur-md">
        <div className="container mx-auto flex h-20 items-center justify-between px-6 md:px-12">
          <div className="flex items-center gap-3">
            <Landmark className="h-7 w-7 text-slate-900" strokeWidth={1.5} />
            <span className="font-serif text-xl tracking-[0.2em] text-slate-900 uppercase">
              Aurelius Partners
            </span>
          </div>
          <div className="flex items-center gap-4">
            {data && (
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Start Over
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 md:px-12 md:py-20">
        {!data ? (
          <div className="flex flex-col items-center justify-center space-y-16">
            <div className="text-center space-y-6 max-w-3xl">
              <h1 className="text-5xl md:text-6xl font-serif font-light tracking-tight text-slate-900">
                Institutional-Grade <br />Financial Clarity.
              </h1>
              <p className="text-lg text-slate-500 font-light tracking-wide leading-relaxed">
                Upload your statements for proprietary analysis, intelligent categorization, and comprehensive wealth insights.
              </p>
            </div>

            <UploadArea onUpload={handleUpload} isProcessing={isProcessing} />

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 max-w-md w-full text-center">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl w-full pt-16 border-t border-stone-200">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-14 w-14 rounded-none border border-stone-200 bg-white flex items-center justify-center text-slate-700 mb-2">
                  <ShieldCheck className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-xl text-slate-900">Bank-Level Security</h3>
                <p className="text-sm text-slate-500 font-light leading-relaxed">
                  Your financial data is processed with uncompromising security protocols and never stored permanently.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-14 w-14 rounded-none border border-stone-200 bg-white flex items-center justify-center text-slate-700 mb-2">
                  <FileText className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-xl text-slate-900">Intelligent Parsing</h3>
                <p className="text-sm text-slate-500 font-light leading-relaxed">
                  Proprietary AI models extract and categorize transactions with institutional precision.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-14 w-14 rounded-none border border-stone-200 bg-white flex items-center justify-center text-slate-700 mb-2">
                  <RefreshCw className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-xl text-slate-900">Entity Separation</h3>
                <p className="text-sm text-slate-500 font-light leading-relaxed">
                  Seamlessly distinguish between personal wealth and corporate treasury activities.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Dashboard data={data} onUpdateData={setData} />
          </div>
        )}
      </main>
    </div>
  );
}
