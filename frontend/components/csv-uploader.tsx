"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const LOADING_PHRASES = [
  "Establishing secure connection...",
  "Validating payload structure...",
  "Encrypting employee records...",
  "Provisioning Celery workers...",
  "Initializing PDF engine...",
  "Preparing AWS S3 buckets...",
  "Dispatching payroll batch..."
];

type UploadStep = "roster" | "salary" | "preview" | "processing" | "success";

export function CsvUploader() {
  const router = useRouter();
  
  // Pipeline State
  const [currentStep, setCurrentStep] = useState<UploadStep>("roster");
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === "processing") {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
      }, 1800); 
    }
    return () => clearInterval(interval);
  }, [currentStep]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      processFileUpload(droppedFile);
    } else {
      console.error("Invalid file type uploaded. Please upload a CSV.");
    }
  }, [currentStep]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFileUpload(selectedFile);
    }
  };

  // Central handler for both file uploads depending on the current step
  const processFileUpload = async (file: File) => {
    const orgId = localStorage.getItem("aepp_org_id");
    if (!orgId) {
      router.push("/");
      return;
    }

    const formData = new FormData();
    formData.append("organization_id", orgId);
    formData.append("file", file);

    try {
      if (currentStep === "roster") {
        // Step 1: Upload Roster
        const res = await fetch("/api/v1/employees/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Failed to upload employee roster.");
        
        // Move to Salary Upload step
        setCurrentStep("salary");
        if (fileInputRef.current) fileInputRef.current.value = '';

      } else if (currentStep === "salary") {
        // Step 2: Upload Salary for Preview
        const res = await fetch("/api/v1/payroll/preview", {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Failed to generate preview.");
        }
        
        const data = await res.json();
        setPreviewData(data.preview);
        setCurrentStep("preview");
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (error: any) {
      alert(error.message);
      console.error(error);
    }
  };

  // Step 3: Confirm and Trigger Celery
  const handleConfirmAndProcess = async () => {
    const orgId = localStorage.getItem("aepp_org_id");
    if (!orgId || previewData.length === 0) return;
    
    setCurrentStep("processing");
    setLoadingTextIndex(0);

    try {
      const response = await fetch("/api/v1/payroll/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId,
          payroll_data: previewData
        }),
      });

      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
      
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      setCurrentStep("success");
      
      setTimeout(() => {
        setCurrentStep("roster");
        setPreviewData([]); 
      }, 3000);

    } catch (error) {
      console.error("Transmission failed:", error);
      alert("Failed to process payroll. Check console for details.");
      setCurrentStep("preview");
    }
  };

  const resetFlow = () => {
    setCurrentStep("roster");
    setPreviewData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ================= UI RENDERERS ================= //

  if (currentStep === "success") {
    return (
      <div className="w-full h-[500px] bg-[#09090b] border border-white/5 rounded-[24px] flex flex-col items-center justify-center animate-in fade-in duration-300">
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

  if (currentStep === "processing") {
    return (
      <div className="w-full h-[500px] bg-[#09090b] border border-white/5 rounded-[24px] flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="relative w-16 h-16 mb-8">
          <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-r-2 border-zinc-500 animate-spin flex-reverse"></div>
        </div>
        <div className="h-8 flex items-center justify-center overflow-hidden">
          <p key={loadingTextIndex} className="text-zinc-300 font-medium tracking-wide animate-in slide-in-from-bottom-4 fade-in duration-300">
            {LOADING_PHRASES[loadingTextIndex]}
          </p>
        </div>
        <p className="text-zinc-600 text-xs mt-4">Please do not close this window</p>
      </div>
    );
  }

  if (currentStep === "preview" && previewData.length > 0) {
    const headers = Object.keys(previewData[0]);
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
        <div className="flex items-center justify-between bg-[#09090b] p-5 rounded-[20px] border border-white/5">
          <div>
            <h3 className="text-base font-semibold text-white">Salary Payload Ready</h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              Merged <span className="text-white font-medium">{previewData.length}</span> employee records.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={resetFlow} className="rounded-full text-zinc-400 hover:text-white hover:bg-white/5">
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
                      {header.replace("_", " ").toUpperCase()}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs font-medium text-zinc-500 h-12 text-right tracking-wider px-6">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, i) => (
                  <TableRow key={i} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    {headers.map((header) => (
                      <TableCell key={header} className="text-sm py-4 text-zinc-300 px-6">
                        {row[header]}
                      </TableCell>
                    ))}
                    <TableCell className="text-right py-4 px-6">
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold text-zinc-500 border-white/10 bg-transparent rounded-full px-2">Ready</Badge>
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

  // Roster or Salary Upload Dropzone
  const isRosterStep = currentStep === "roster";
  
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
      <input type="file" accept=".csv" onChange={handleFileInput} ref={fileInputRef} className="hidden" />
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-5 transition-transform duration-300 ${
        isDragging ? "bg-white text-black scale-110" : "bg-white/5 border border-white/10 text-zinc-400 group-hover:bg-white group-hover:text-black group-hover:scale-105"
      }`}>
        {isRosterStep ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        )}
      </div>
      <h3 className="font-medium text-base text-zinc-200">
        {isRosterStep ? "Step 1: Upload Employee Roster CSV" : "Step 2: Upload Monthly Salary CSV"}
      </h3>
      <p className="text-sm text-zinc-500 mt-2">
        {isDragging ? "Drop the file here to parse" : (isRosterStep ? "Contains IDs, Names, Emails, and Designations" : "Contains IDs and compensation breakdown")}
      </p>
    </div>
  );
}