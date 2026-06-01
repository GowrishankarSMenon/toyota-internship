"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CsvUploader } from "../../components/csv-uploader";

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const orgId = localStorage.getItem("aepp_org_id");

    if (!orgId) {
      router.replace("/");
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Payroll Dashboard</h1>
          <p className="text-zinc-400 mt-1 text-sm">Upload your employee data to initiate the secure payroll pipeline.</p>
        </div>
        
        {/* Render the Uploader */}
        <CsvUploader />
      </div>
    </div>
  );
}