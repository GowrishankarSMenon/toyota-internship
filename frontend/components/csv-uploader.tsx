"use client";

import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export function CsvUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawFile, setRawFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      alert("Please upload a valid CSV file.");
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  // The Real API Integration Function
  const handleConfirmAndProcess = async () => {
    if (!rawFile) return;
    
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("file", rawFile); 

    try {
      const response = await fetch("http://localhost:8000/api/v1/payroll/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const result = await response.json();
      console.log("Success:", result);
      
      alert("Payload dispatched successfully! Celery workers are processing the batch.");
      
      // Clean up the UI after successful transmission
      setCsvData([]); 
      setRawFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error) {
      console.error("Transmission failed:", error);
      alert("Failed to connect to the backend. Is FastAPI running?");
    } finally {
      setIsProcessing(false);
    }
  };

  // State 1: The Data Grid (Preview Mode)
  if (csvData.length > 0) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
        <div className="flex items-center justify-between bg-background/50 p-4 rounded-xl border border-border/50">
          <div>
            <h3 className="text-sm font-medium text-foreground">Payload Ready for Review</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Found <span className="font-semibold text-foreground">{csvData.length}</span> employee records.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => {
              setCsvData([]);
              setRawFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmAndProcess} disabled={isProcessing} className="h-8 text-xs bg-foreground text-background hover:bg-foreground/90">
              {isProcessing ? "Transmitting..." : "Confirm & Process"}
            </Button>
          </div>
        </div>

        {/* Scroll Hint Area */}
        <div className="flex justify-end px-2 pb-0.5">
          <div className="flex items-center text-[11px] font-medium text-muted-foreground/70">
            <svg className="w-3 h-3 mr-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Scroll horizontally to view all columns
          </div>
        </div>

        <div className="border border-border/50 rounded-xl overflow-hidden bg-background/50 w-full">
          <ScrollArea className="h-[400px] w-full whitespace-nowrap">
            <Table>
              <TableHeader className="bg-background sticky top-0 z-10 border-b border-border/50 shadow-sm">
                <TableRow className="border-none hover:bg-transparent">
                  {headers.map((header) => (
                    <TableHead key={header} className="text-xs font-semibold text-muted-foreground h-10 tracking-wide px-4">
                      {header.toUpperCase()}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs font-semibold text-muted-foreground h-10 text-right tracking-wide px-4">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData.map((row, i) => (
                  <TableRow key={i} className="border-border/50 hover:bg-muted/10 transition-colors">
                    {headers.map((header) => (
                      <TableCell key={header} className="text-sm py-3 text-foreground/90 px-4">
                        {row[header]}
                      </TableCell>
                    ))}
                    <TableCell className="text-right py-3 px-4">
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold text-muted-foreground bg-transparent">Pending</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
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
      className={`border border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer group relative ${
        isDragging 
          ? "border-primary bg-primary/5 scale-[1.02]" 
          : "border-border/60 bg-muted/20 hover:bg-muted/40"
      }`}
    >
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileInput} 
        ref={fileInputRef}
        className="hidden" 
      />
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-transform duration-200 ${
        isDragging ? "bg-primary text-primary-foreground scale-110" : "bg-secondary border border-border text-foreground group-hover:scale-105"
      }`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
      </div>
      <h3 className="font-medium text-sm text-foreground">
        {isDragging ? "Drop the payload here" : "Click to upload or drag and drop"}
      </h3>
      <p className="text-xs text-muted-foreground mt-1.5">Strictly CSV files only</p>
    </div>
  );
}