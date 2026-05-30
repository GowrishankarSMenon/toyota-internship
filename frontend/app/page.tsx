import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CsvUploader } from "@/components/csv-uploader"; 

export default function Dashboard() {
  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Payroll Operations</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium tracking-wide">
            Automated salary slip generation and secure dispatch.
          </p>
        </div>
        <Badge variant="secondary" className="px-4 py-1.5 text-xs font-semibold tracking-wide rounded-full">
          Admin Portal
        </Badge>
      </div>

      {/* Main Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dropzone & Table Area */}
        <Card className="lg:col-span-2 shadow-none border-border flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-medium tracking-tight">Upload Payload</CardTitle>
            <CardDescription className="text-sm">
              Review and verify the monthly payroll sheet before triggering background workers.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            
            {/* The Interactive Client Component */}
            <CsvUploader />

          </CardContent>
        </Card>

        {/* System Status Panel */}
        <Card className="shadow-none border-border flex flex-col h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-medium tracking-tight">System Status</CardTitle>
            <CardDescription className="text-sm">Pipeline health and telemetry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg border border-border/50 bg-background/50">
              <span className="text-sm font-medium text-foreground">API Gateway</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-none font-medium">Online</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border border-border/50 bg-background/50">
              <span className="text-sm font-medium text-foreground">Celery Workers</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-none font-medium">Idle</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border border-border/50 bg-background/50">
              <span className="text-sm font-medium text-foreground">S3 Storage</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-none font-medium">Secured</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}