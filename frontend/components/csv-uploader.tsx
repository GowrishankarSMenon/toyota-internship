"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api";

const LOADING_PHRASES = [
  "Establishing secure connection...",
  "Validating payload structure...",
  "Encrypting employee records...",
  "Provisioning Celery workers...",
  "Initializing PDF engine...",
  "Preparing AWS S3 buckets...",
  "Dispatching payroll batch..."
];

export function CsvUploader() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Pipeline States
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [rawFile, setRawFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
      }, 1800); 
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = (file: File) => {
    setRawFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), 
      complete: (results) => {
        if (results.data.length > 0) {
          setHeaders(Object.keys(results.data[0] as object));
          setCsvData(results.data);
        }
      },
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      processFile(droppedFile);
    } else {
      // Soft error handling instead of an alert
      console.error("Invalid file type uploaded.");
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleConfirmAndProcess = async () => {
    if (!rawFile) return;
    
    const orgId = localStorage.getItem("aepp_org_id");
    if (!orgId) {
      router.push("/");
      return;
    }

    setIsProcessing(true);
    setLoadingTextIndex(0);

    const formData = new FormData();
    formData.append("organization_id", orgId);
    formData.append("file", rawFile); 

    try {
      const response = await fetch(apiUrl("/api/v1/payroll/upload"), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      // Artificial delay to let the loading UI cycle
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Transition from Processing to Success
      setIsProcessing(false);
      setIsSuccess(true);
      
      // Wait 3 seconds to show the success animation, then reset the UI completely
      setTimeout(() => {
        setIsSuccess(false);
        setCsvData([]); 
        setRawFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 3000);

    } catch (error) {
      console.error("Transmission failed:", error);
      setIsProcessing(false);
    }
  };

  // State 3: GPay-Style Success Animation
  if (isSuccess) {
    return (
      <div className="w-full h-[500px] bg-[#09090b] border border-white/5 rounded-[24px] flex flex-col items-center justify-center animate-in fade-in duration-300">
        
        {/* Inline styles for the SVG drawing animation */}
        <style dangerouslySetInnerHTML={{__html: `
          .success-checkmark { width: 80px; height: 80px; margin: 0 auto; display: block; }
          .check-circle { stroke-dasharray: 166; stroke-dashoffset: 166; stroke-width: 2; stroke-miterlimit: 10; stroke: #ffffff; fill: none; animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards; }
          .check-path { transform-origin: 50% 50%; stroke-dasharray: 48; stroke-dashoffset: 48; stroke: #ffffff; stroke-width: 3; fill: none; animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards; }
          @keyframes stroke { 100% { stroke-dashoffset: 0; } }
        `}} />

        <div className="mb-6">
          <svg className="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
            <circle className="check-circle" cx="26" cy="26" r="25" />
            <path className="check-path" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-white tracking-tight animate-in slide-in-from-bottom-4 fade-in duration-500 delay-300 fill-mode-both">
          Pipeline Dispatched
        </h3>
        <p className="text-sm text-zinc-400 mt-2 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-500 fill-mode-both">
          Workers are generating highly secure salary slips.
        </p>
      </div>
    );
  }

  // State 2: Dynamic Loading UI
  if (isProcessing) {
    return (
      <div className="w-full h-[500px] bg-[#09090b] border border-white/5 rounded-[24px] flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="relative w-16 h-16 mb-8">
          <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-r-2 border-zinc-500 animate-spin flex-reverse"></div>
        </div>
        <div className="h-8 flex items-center justify-center overflow-hidden">
          <p 
            key={loadingTextIndex} 
            className="text-zinc-300 font-medium tracking-wide animate-in slide-in-from-bottom-4 fade-in duration-300"
          >
            {LOADING_PHRASES[loadingTextIndex]}
          </p>
        </div>
        <p className="text-zinc-600 text-xs mt-4">Please do not close this window</p>
      </div>
    );
  }

  // State 1: The Data Grid (Preview Mode)
  if (csvData.length > 0) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
        <div className="flex items-center justify-between bg-[#09090b] p-5 rounded-[20px] border border-white/5">
          <div>
            <h3 className="text-base font-semibold text-white">Payload Ready for Review</h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              Found <span className="text-white font-medium">{csvData.length}</span> employee records.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => {
              setCsvData([]);
              setRawFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }} className="rounded-full text-zinc-400 hover:text-white hover:bg-white/5">
              Cancel
            </Button>
            <Button onClick={handleConfirmAndProcess} className="rounded-full bg-white text-black hover:bg-zinc-200 font-medium px-6">
              Confirm & Process
            </Button>
          </div>
        </div>

        <div className="border border-white/5 rounded-[20px] overflow-hidden bg-[#09090b] w-full">
          <ScrollArea className="h-[450px] w-full whitespace-nowrap">
            <Table>
              <TableHeader className="bg-[#09090b] sticky top-0 z-10 border-b border-white/5 shadow-sm">
                <TableRow className="border-none hover:bg-transparent">
                  {headers.map((header) => (
                    <TableHead key={header} className="text-xs font-medium text-zinc-500 h-12 tracking-wider px-6">
                      {header.toUpperCase()}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs font-medium text-zinc-500 h-12 text-right tracking-wider px-6">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData.map((row, i) => (
                  <TableRow key={i} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    {headers.map((header) => (
                      <TableCell key={header} className="text-sm py-4 text-zinc-300 px-6">
                        {row[header]}
                      </TableCell>
                    ))}
                    <TableCell className="text-right py-4 px-6">
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold text-zinc-500 border-white/10 bg-transparent rounded-full px-2">Pending</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" className="bg-white/5" />
          </ScrollArea>
        </div>
      </div>
    );
  }

  // State 0: The Dropzone
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()} 
      className={`border border-dashed rounded-[24px] p-16 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer group relative ${
        isDragging 
          ? "border-white/40 bg-white/5 scale-[1.01]" 
          : "border-white/10 bg-[#09090b] hover:border-white/20 hover:bg-white/[0.02]"
      }`}
    >
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileInput} 
        ref={fileInputRef}
        className="hidden" 
      />
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-5 transition-transform duration-300 ${
        isDragging ? "bg-white text-black scale-110" : "bg-white/5 border border-white/10 text-zinc-400 group-hover:bg-white group-hover:text-black group-hover:scale-105"
      }`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
      </div>
      <h3 className="font-medium text-base text-zinc-200">
        {isDragging ? "Drop the payload here" : "Click to upload or drag and drop"}
      </h3>
      <p className="text-sm text-zinc-500 mt-2">Strictly CSV format accepted</p>
    </div>
  );
}