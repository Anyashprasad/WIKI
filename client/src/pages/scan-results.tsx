import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Shield, Wrench, Database, Code, ShieldAlert, Bug, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VulnerabilityChart from "@/components/vulnerability-chart";
import type { Scan, Vulnerability } from "@shared/schema";

const severityColors = {
  Critical: "bg-red-500/10 border-red-500/20 text-red-400",
  High: "bg-orange-500/10 border-orange-500/20 text-orange-400", 
  Medium: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  Low: "bg-green-500/10 border-green-500/20 text-green-400",
};

const categoryIcons = {
  "SQL Injection": Database,
  "XSS": Code,
  "CSRF": ShieldAlert,
  "API Issues": Bug,
  "Load Testing": Zap,
};

export default function ScanResults() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: scan, isLoading } = useQuery<Scan>({
    queryKey: ['/api/scans', id],
    refetchInterval: (query) => query.state.data?.status === 'completed' ? false : 2000,
  });

  const exportMutation = useMutation({
    mutationFn: async (format: string) => {
      const response = await apiRequest("GET", `/api/scans/${id}/export?format=${format}`);
      return { format, data: await response.json() };
    },
    onSuccess: ({ format, data }) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scan-${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `Scan results exported as ${format.toUpperCase()}`,
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Unable to export scan results. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateFixMutation = useMutation({
    mutationFn: async (vulnerability: Vulnerability) => {
      const response = await apiRequest("POST", `/api/vulnerabilities/${vulnerability.id}/fix`, {
        vulnerability
      });
      return response.json();
    },
    onSuccess: ({ fix }) => {
      toast({
        title: "Fix Generated",
        description: "Remediation suggestion created successfully.",
      });
      // Show fix in a modal or alert - temporary implementation
      alert(fix);
    },
    onError: () => {
      toast({
        title: "Fix Generation Failed",
        description: "Unable to generate fix suggestion. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white">
        <header className="border-b border-border-dark bg-card-bg/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-8 h-8 bg-card-bg" />
                <Skeleton className="w-48 h-6 bg-card-bg" />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="w-full h-64 bg-card-bg mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Skeleton className="w-full h-80 bg-card-bg" />
            <Skeleton className="w-full h-80 bg-card-bg" />
          </div>
        </main>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Scan Not Found</h2>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            <ArrowLeft className="mr-2" size={16} />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const vulnerabilities = (scan.vulnerabilities as Vulnerability[]) || [];
  const severityCounts = {
    Critical: vulnerabilities.filter(v => v.severity === "Critical").length,
    High: vulnerabilities.filter(v => v.severity === "High").length,
    Medium: vulnerabilities.filter(v => v.severity === "Medium").length,
    Low: vulnerabilities.filter(v => v.severity === "Low").length,
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <header className="border-b border-border-dark bg-card-bg/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/")}
                className="w-8 h-8 bg-border-dark hover:bg-hacker-green hover:text-dark-bg transition-all duration-200 p-0"
                data-testid="button-back"
              >
                <ArrowLeft size={16} />
              </Button>
              <div className="w-8 h-8 bg-hacker-green rounded-lg flex items-center justify-center">
                <Shield className="text-dark-bg" size={18} />
              </div>
              <h1 className="text-xl font-bold terminal-font">
                <span className="text-hacker-green">WIKI</span> Security Scanner
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => exportMutation.mutate("json")}
                disabled={exportMutation.isPending}
                className="bg-card-bg border-border-dark hover:border-hacker-green"
                data-testid="button-export-json"
              >
                <Download className="mr-2" size={16} />
                Export JSON
              </Button>
              <Button 
                size="sm"
                className="bg-hacker-green text-dark-bg hover:bg-hacker-green/80"
                data-testid="button-export-pdf"
              >
                <FileText className="mr-2" size={16} />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scan Summary */}
        <div className="mb-8">
          <Card className="bg-card-bg border-border-dark">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">Scan Results</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-hacker-green rounded-full pulse-green"></div>
                  <span className="text-sm text-gray-400 terminal-font" data-testid="scan-target">
                    {scan.url}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(severityCounts).map(([severity, count]) => (
                  <div
                    key={severity}
                    className={`text-center p-4 rounded-lg border ${severityColors[severity as keyof typeof severityColors]}`}
                  >
                    <div className="text-2xl font-bold" data-testid={`count-${severity.toLowerCase()}`}>
                      {count}
                    </div>
                    <div className="text-sm text-gray-400">{severity}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {vulnerabilities.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="bg-card-bg border-border-dark">
              <CardHeader>
                <CardTitle>Vulnerability Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <VulnerabilityChart vulnerabilities={vulnerabilities} type="category" />
              </CardContent>
            </Card>
            
            <Card className="bg-card-bg border-border-dark">
              <CardHeader>
                <CardTitle>Severity Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <VulnerabilityChart vulnerabilities={vulnerabilities} type="severity" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Vulnerability Details */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Detected Vulnerabilities</h3>
          
          {scan.status === "scanning" && (
            <Card className="bg-card-bg border-border-dark">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-hacker-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Scanning in progress...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {vulnerabilities.length === 0 && scan.status === "completed" && (
            <Card className="bg-card-bg border-border-dark">
              <CardContent className="p-6">
                <div className="text-center">
                  <Shield className="w-16 h-16 text-hacker-green mx-auto mb-4" />
                  <h4 className="text-lg font-semibold mb-2">No Vulnerabilities Found</h4>
                  <p className="text-gray-400">This website appears to be secure. Great job!</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {vulnerabilities.map((vulnerability) => {
            const Icon = categoryIcons[vulnerability.category];
            return (
              <Card 
                key={vulnerability.id} 
                className={`bg-card-bg border ${severityColors[vulnerability.severity].split(' ')[1]}`}
                data-testid={`vulnerability-${vulnerability.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${severityColors[vulnerability.severity]}`}>
                        <Icon className="text-xl" size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold" data-testid={`vuln-name-${vulnerability.id}`}>
                          {vulnerability.name}
                        </h4>
                        <Badge variant="outline" className={severityColors[vulnerability.severity]}>
                          {vulnerability.severity} Severity
                        </Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => generateFixMutation.mutate(vulnerability)}
                      disabled={generateFixMutation.isPending}
                      className="bg-hacker-green text-dark-bg hover:bg-hacker-green/80 hover:scale-105 transition-all duration-200"
                      data-testid={`button-generate-fix-${vulnerability.id}`}
                    >
                      <Wrench className="mr-2" size={16} />
                      {generateFixMutation.isPending ? "Generating..." : "Generate Fix"}
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-hacker-green mb-2">Description</h5>
                      <p className="text-gray-300 text-sm" data-testid={`vuln-description-${vulnerability.id}`}>
                        {vulnerability.description}
                      </p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-hacker-green mb-2">Location</h5>
                      <code className="text-sm bg-dark-bg p-2 rounded border border-border-dark text-hacker-green terminal-font block" data-testid={`vuln-location-${vulnerability.id}`}>
                        {vulnerability.location}
                      </code>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-hacker-green mb-2">Impact</h5>
                      <p className="text-gray-300 text-sm" data-testid={`vuln-impact-${vulnerability.id}`}>
                        {vulnerability.impact}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
