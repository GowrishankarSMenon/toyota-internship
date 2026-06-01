"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  "Dispatching payroll batch...",
];

const ROSTER_HEADERS = ["employee_id", "name", "email", "designation", "dob"];
const SALARY_HEADERS = ["employee_id", "month_year", "base_salary", "hra", "allowances", "deductions"];

type UploadStep = "roster-edit" | "salary-edit" | "preview" | "processing" | "success";
type CsvRow = Record<string, string>;

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

const emptyRosterRow = (): CsvRow => ({
  employee_id: "",
  name: "",
  email: "",
  designation: "",
  dob: "",
});

const emptySalaryRow = (): CsvRow => ({
  employee_id: "",
  month_year: "",
  base_salary: "",
  hra: "",
  allowances: "",
  deductions: "",
});

const rosterSampleCsv = Papa.unparse([
  {
    employee_id: "EMP001",
    name: "John Doe",
    email: "john.doe@company.com",
    designation: "Engineer",
    dob: "1990-04-12",
  },
  {
    employee_id: "EMP002",
    name: "Jane Smith",
    email: "jane.smith@company.com",
    designation: "Manager",
    dob: "1988-09-03",
  },
]);

const salarySampleCsv = Papa.unparse([
  {
    employee_id: "EMP001",
    month_year: "June 2026",
    base_salary: "50000",
    hra: "10000",
    allowances: "5000",
    deductions: "2000",
  },
  {
    employee_id: "EMP002",
    month_year: "June 2026",
    base_salary: "80000",
    hra: "15000",
    allowances: "8000",
    deductions: "3000",
  },
]);

function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseCsvRows(file: File) {
  return file.text().then((text) => {
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      transform: (value) => (typeof value === "string" ? value.trim() : value),
    });

    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors[0]?.message || "Failed to parse CSV file.");
    }

    const rows = parsed.data
      .map((row) => {
        const normalized: CsvRow = {};
        Object.entries(row).forEach(([key, value]) => {
          normalized[normalizeHeader(key)] = String(value ?? "").trim();
        });
        return normalized;
      })
      .filter((row) => Object.values(row).some((value) => value.trim().length > 0));

    return rows;
  });
}

function sanitizeRows(rows: CsvRow[], headers: string[]) {
  return rows.map((row) => {
    const nextRow: CsvRow = {};
    headers.forEach((header) => {
      nextRow[header] = row[header] ?? "";
    });
    return nextRow;
  });
}

function rowsToFile(rows: CsvRow[], headers: string[], filename: string) {
  const csvText = Papa.unparse(
    rows.map((row) => {
      const output: CsvRow = {};
      headers.forEach((header) => {
        output[header] = row[header] ?? "";
      });
      return output;
    }),
    { columns: headers }
  );

  return new File([csvText], filename, { type: "text/csv" });
}

function getPopulatedRows(rows: CsvRow[]) {
  return rows.filter((row) => Object.values(row).some((value) => value.trim().length > 0));
}

export function CsvUploader() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState<UploadStep>("roster-edit");
  const [isDragging, setIsDragging] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [rosterRows, setRosterRows] = useState<CsvRow[]>([emptyRosterRow()]);
  const [salaryRows, setSalaryRows] = useState<CsvRow[]>([emptySalaryRow()]);
  const [previewData, setPreviewData] = useState<CsvRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);

  useEffect(() => {
    if (currentStep !== "processing") return;

    const interval = setInterval(() => {
      setLoadingTextIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [currentStep]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRowChange = (step: "roster" | "salary", rowIndex: number, key: string, value: string) => {
    const updater = step === "roster" ? setRosterRows : setSalaryRows;
    updater((currentRows) =>
      currentRows.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row))
    );
  };

  const addRow = (step: "roster" | "salary") => {
    if (step === "roster") {
      setRosterRows((currentRows) => [...currentRows, emptyRosterRow()]);
    } else {
      setSalaryRows((currentRows) => [...currentRows, emptySalaryRow()]);
    }
  };

  const removeRow = (step: "roster" | "salary", rowIndex: number) => {
    if (step === "roster") {
      setRosterRows((currentRows) => currentRows.filter((_, index) => index !== rowIndex));
    } else {
      setSalaryRows((currentRows) => currentRows.filter((_, index) => index !== rowIndex));
    }
  };

  const loadFileIntoStep = async (file: File) => {
    setError(null);

    try {
      const rows = await parseCsvRows(file);

      if (currentStep === "roster-edit") {
        if (rows.length === 0) {
          throw new Error("Roster CSV is empty.");
        }
        setRosterRows(sanitizeRows(rows, ROSTER_HEADERS));
        setActiveFileName(file.name);
      } else if (currentStep === "salary-edit") {
        if (rows.length === 0) {
          throw new Error("Salary CSV is empty.");
        }
        setSalaryRows(sanitizeRows(rows, SALARY_HEADERS));
        setActiveFileName(file.name);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to read the CSV file.");
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      void loadFileIntoStep(selectedFile);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      void loadFileIntoStep(droppedFile);
    } else {
      setError("Please upload a CSV file.");
    }
  }, [currentStep]);

  const getOrgId = () => {
    const orgId = localStorage.getItem("aepp_org_id");
    if (!orgId) {
      router.push("/");
      return null;
    }
    return orgId;
  };

  const uploadRosterAndContinue = async () => {
    const orgId = getOrgId();
    const populatedRosterRows = getPopulatedRows(rosterRows);
    if (!orgId || populatedRosterRows.length === 0) {
      setError("Add at least one roster row before continuing.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const rosterFile = rowsToFile(populatedRosterRows, ROSTER_HEADERS, activeFileName || "employee-roster.csv");
      const formData = new FormData();
      formData.append("organization_id", orgId);
      formData.append("file", rosterFile);

      const response = await fetch(apiUrl("/api/v1/employees/upload"), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || "Failed to upload employee roster.");
      }

      setCurrentStep("salary-edit");
      setActiveFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload employee roster.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewSalaryAndContinue = async () => {
    const orgId = getOrgId();
    const populatedSalaryRows = getPopulatedRows(salaryRows);
    if (!orgId || populatedSalaryRows.length === 0) {
      setError("Add at least one salary row before generating the preview.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const salaryFile = rowsToFile(populatedSalaryRows, SALARY_HEADERS, activeFileName || "salary-sheet.csv");
      const formData = new FormData();
      formData.append("organization_id", orgId);
      formData.append("file", salaryFile);

      const response = await fetch(apiUrl("/api/v1/payroll/preview"), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || "Failed to generate preview.");
      }

      const data = await response.json();
      setPreviewData(data.preview || []);
      setCurrentStep("preview");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate preview.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAndProcess = async () => {
    const orgId = getOrgId();
    if (!orgId || previewData.length === 0) return;

    setCurrentStep("processing");
    setLoadingTextIndex(0);

    try {
      const response = await fetch(apiUrl("/api/v1/payroll/process"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId,
          payroll_data: previewData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      setCurrentStep("success");

      setTimeout(() => {
        setCurrentStep("roster-edit");
        setRosterRows([emptyRosterRow()]);
        setSalaryRows([emptySalaryRow()]);
        setPreviewData([]);
        setActiveFileName(null);
      }, 5000); // Extended slightly to let them read the spam warning
    } catch (err) {
      console.error("Transmission failed:", err);
      setError(err instanceof Error ? err.message : "Failed to process payroll.");
      setCurrentStep("preview");
    }
  };

  const renderToolbar = (step: "roster" | "salary") => {
    const isRosterStep = step === "roster";
    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500 mb-2">{isRosterStep ? "Roster Editor" : "Payment Editor"}</p>
          <h3 className="text-lg font-semibold text-white">
            {isRosterStep ? "Edit the employee roster before continuing" : "Edit the salary sheet before previewing"}
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            {isRosterStep ? "Add, remove, or correct employee rows, including DOB for PDF locking, then save to the workspace." : "Make changes to the payment rows, then generate the preview."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              downloadCsv(isRosterStep ? "sample-roster.csv" : "sample-salary.csv", isRosterStep ? rosterSampleCsv : salarySampleCsv);
            }}
            className="rounded-full text-zinc-200 hover:text-white hover:bg-white/5 border border-white/10"
          >
            Download sample CSV
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              addRow(step);
            }}
            className="rounded-full text-zinc-200 hover:text-white hover:bg-white/5 border border-white/10"
          >
            Add row
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="rounded-full text-zinc-200 hover:text-white hover:bg-white/5 border border-white/10"
          >
            Replace file
          </Button>
        </div>
      </div>
    );
  };

  const renderEditableTable = (step: "roster" | "salary") => {
    const rows = step === "roster" ? rosterRows : salaryRows;
    const headers = step === "roster" ? ROSTER_HEADERS : SALARY_HEADERS;

    return (
      <div className="border border-white/5 rounded-[24px] overflow-hidden bg-[#09090b] w-full">
        <ScrollArea className="max-h-[460px] w-full whitespace-nowrap">
          <Table>
            <TableHeader className="bg-[#09090b] sticky top-0 z-10 border-b border-white/5 shadow-sm">
              <TableRow className="border-none hover:bg-transparent">
                {headers.map((header) => (
                  <TableHead key={header} className="text-xs font-medium text-zinc-500 h-12 tracking-wider px-6">
                    {header.replace(/_/g, " ").toUpperCase()}
                  </TableHead>
                ))}
                <TableHead className="text-xs font-medium text-zinc-500 h-12 text-right tracking-wider px-6">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={`${step}-${rowIndex}`} className="border-white/5 hover:bg-white/[0.02] transition-colors align-top">
                  {headers.map((header) => (
                    <TableCell key={header} className="px-3 py-3">
                      <Input
                        value={row[header] ?? ""}
                        onChange={(event) => handleRowChange(step, rowIndex, header, event.target.value)}
                        placeholder={header.replace(/_/g, " ")}
                        className="h-10 rounded-lg bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-white/20"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="px-6 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeRow(step, rowIndex);
                      }}
                      className="rounded-full text-zinc-400 hover:text-white hover:bg-white/5 border border-white/10"
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" className="bg-white/5" />
        </ScrollArea>
      </div>
    );
  };

  if (currentStep === "success") {
    return (
      <div className="w-full h-[500px] bg-[#09090b] border border-white/5 rounded-[24px] flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="mb-6">
          <svg className="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{ width: 80, height: 80, display: "block" }}>
            <circle cx="26" cy="26" r="25" fill="none" stroke="#ffffff" strokeWidth="2" />
            <path d="M14.1 27.2l7.1 7.2 16.7-16.8" fill="none" stroke="#ffffff" strokeWidth="3" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white tracking-tight">Pipeline Dispatched</h3>
        <p className="text-sm text-zinc-400 mt-2">Workers are generating highly secure salary slips.</p>
        <p className="text-xs text-zinc-500 mt-1">Please check your spam folder if the emails are not received shortly.</p>
      </div>
    );
  }

  if (currentStep === "processing") {
    return (
      <div className="w-full h-[500px] bg-[#09090b] border border-white/5 rounded-[24px] flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="relative w-16 h-16 mb-8">
          <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin" />
          <div className="absolute inset-2 rounded-full border-r-2 border-zinc-500 animate-spin flex-reverse" />
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-[#09090b] p-5 rounded-[20px] border border-white/5">
          <div>
            <h3 className="text-base font-semibold text-white">Salary Payload Ready</h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              Merged <span className="text-white font-medium">{previewData.length}</span> employee records.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep("salary-edit")}
              className="rounded-full text-zinc-200 hover:text-white hover:bg-white/5 border border-white/10"
            >
              Back to payment editor
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setCurrentStep("roster-edit");
                setPreviewData([]);
              }}
              className="rounded-full text-zinc-200 hover:text-white hover:bg-white/5 border border-white/10"
            >
              Reset flow
            </Button>
            <Button
              onClick={handleConfirmAndProcess}
              disabled={isSubmitting}
              className="rounded-full bg-white text-black hover:bg-zinc-200 font-medium px-6"
            >
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
                      {header.replace(/_/g, " ").toUpperCase()}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs font-medium text-zinc-500 h-12 text-right tracking-wider px-6">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, rowIndex) => (
                  <TableRow key={`preview-${rowIndex}`} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    {headers.map((header) => (
                      <TableCell key={header} className="text-sm py-4 text-zinc-300 px-6">
                        {row[header]}
                      </TableCell>
                    ))}
                    <TableCell className="text-right py-4 px-6">
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold text-zinc-500 border-white/10 bg-transparent rounded-full px-2">
                        Ready
                      </Badge>
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

  const isRosterStep = currentStep === "roster-edit";
  const currentRows = isRosterStep ? rosterRows : salaryRows;
  const populatedCurrentRows = getPopulatedRows(currentRows);
  const hasRows = currentRows.length > 0;

  return (
    <div className="space-y-5 w-full">
      <div className="flex flex-col items-center w-full gap-4 animate-in fade-in duration-300">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border border-dashed rounded-[24px] p-8 md:p-12 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer group relative ${
            isDragging
              ? "border-white/40 bg-white/5 scale-[1.01]"
              : "border-white/10 bg-[#09090b] hover:border-white/20 hover:bg-white/[0.02]"
          }`}
        >
          <input type="file" accept=".csv" onChange={handleFileInput} ref={fileInputRef} className="hidden" />

          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-5 transition-transform duration-300 ${
              isDragging
                ? "bg-white text-black scale-110"
                : "bg-white/5 border border-white/10 text-zinc-400 group-hover:bg-white group-hover:text-black group-hover:scale-105"
            }`}
          >
            {isRosterStep ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <h3 className="font-medium text-base text-zinc-200">
            {isRosterStep ? "Drop or upload the employee roster CSV" : "Drop or upload the salary CSV"}
          </h3>
          <p className="text-sm text-zinc-500 mt-2">
            {isDragging ? "Drop the file here to parse" : (isRosterStep ? "Roster: employee_id, name, email, designation, dob" : "Salary: employee_id, month_year, base_salary, hra, allowances, deductions")}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                downloadCsv(isRosterStep ? "sample-roster.csv" : "sample-salary.csv", isRosterStep ? rosterSampleCsv : salarySampleCsv);
              }}
              className="rounded-full text-zinc-200 hover:text-white hover:bg-white/5 border border-white/10"
            >
              Download sample CSV
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="rounded-full text-zinc-200 hover:text-white hover:bg-white/5 border border-white/10"
            >
              Upload CSV
            </Button>
          </div>
        </div>

        {isRosterStep && (
          <Button 
            variant="ghost" 
            onClick={(e) => {
              e.stopPropagation();
              setCurrentStep("salary-edit");
            }} 
            className="text-zinc-500 hover:text-white rounded-full text-xs tracking-wide uppercase"
          >
            Skip to Monthly Salary Upload If User already uploaded &rarr;
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-[#09090b] border border-white/5 rounded-[24px] p-5 md:p-6">
        {renderToolbar(isRosterStep ? "roster" : "salary")}

        {hasRows ? (
          <>
            {renderEditableTable(isRosterStep ? "roster" : "salary")}

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-5 pt-5 border-t border-white/5">
              <div className="text-sm text-zinc-400">
                {populatedCurrentRows.length} row{populatedCurrentRows.length === 1 ? "" : "s"} ready for {isRosterStep ? "the roster upload" : "the payment preview"}.
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isRosterStep) {
                      setRosterRows([emptyRosterRow()]);
                    } else {
                      setSalaryRows([emptySalaryRow()]);
                    }
                  }}
                  className="rounded-full text-zinc-200 hover:text-white hover:bg-white/5 border border-white/10"
                >
                  Clear rows
                </Button>

                {isRosterStep ? (
                  <Button
                    type="button"
                    onClick={uploadRosterAndContinue}
                    disabled={isSubmitting}
                    className="rounded-full bg-white text-black hover:bg-zinc-200 font-medium px-6"
                  >
                    Save roster & continue to salary CSV
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setCurrentStep("roster-edit")}
                      className="rounded-full text-zinc-200 hover:text-white hover:bg-white/5 border border-white/10"
                    >
                      Back to roster
                    </Button>
                    <Button
                      type="button"
                      onClick={previewSalaryAndContinue}
                      disabled={isSubmitting}
                      className="rounded-full bg-white text-black hover:bg-zinc-200 font-medium px-6"
                    >
                      Preview payment CSV
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-[20px] border border-white/5 bg-white/[0.02] p-6 text-sm text-zinc-400">
            No rows yet. Upload a CSV or use the sample download to start.
          </div>
        )}
      </div>
    </div>
  );
}