import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Shield, Wrench, Database, Code, ShieldAlert, Bug, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VulnerabilityChart from "@/components/vulnerability-chart";
import type { Scan, Vulnerability } from "../../../shared";

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

interface ScanProgress {
  pagesScanned: number;
  totalPages: number;
  vulnerabilitiesFound: number;
  currentUrl: string;
  stage: string;
  logs: string[];
  status?: string;
  progress?: number;
  currentStage?: string;
  vulnerabilities?: Vulnerability[];
  formsFound?: number;
}

/**
 * ScanResults Component
 * Displays the real-time progress and final results of a vulnerability scan.
 * Connects to a WebSocket server to receive live updates.
 */
export default function ScanResults() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Ensure id is always a string
  if (!id) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Scan ID</h1>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { data: initialScan, isLoading } = useQuery<Scan>({
    queryKey: ['/api/scans', id],
  });

  const [scan, setScan] = useState<Scan | null>(null);
  const [progress, setProgress] = useState<ScanProgress>({
    pagesScanned: 0,
    totalPages: 0,
    vulnerabilitiesFound: 0,
    currentUrl: "",
    stage: "initializing",
    logs: []
  });
  const socketRef = useRef<Socket | null>(null);

  // Initialize scan state from query result and keep it in sync
  useEffect(() => {
    if (initialScan) {
      setScan(initialScan);
    }
  }, [initialScan]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!id || scan?.status === 'completed') return;

    const socket = io({
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected');
      socket.emit('join-scan', id);
    });

    socket.on('scan-progress', (data: ScanProgress) => {
      console.log('Received scan progress:', data);
      setProgress(prev => ({
        ...prev,
        ...data,
        logs: [...prev.logs, ...(data.logs || [])].slice(-50) // Keep last 50 logs
      }));

      // Invalidate query to fetch latest results when scan completes
      if (data.status === 'completed') {
        queryClient.invalidateQueries({ queryKey: [`/api/scans/${id}`] });
      }
    });

    socket.on('scan-error', (error) => {
      console.error('Scan error:', error);
      toast({
        title: "Scan Error",
        description: error.message || "An error occurred during scanning",
        variant: "destructive",
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    return () => {
      socket.emit('leave-scan', id);
      socket.disconnect();
    };
  }, [id, toast]);

  const exportMutation = useMutation({
    mutationFn: async (format: string) => {
      const response = await apiRequest("GET", `/api/scans/${id}/export?format=${format}`);

      if (format === 'excel') {
        // For Excel, we need to get the file as a blob
        const blob = await response.blob();
        return { format, data: blob, isBinary: true };
      } else if (format === 'pdf') {
        // For PDF, we also need binary data
        const blob = await response.blob();
        return { format, data: blob, isBinary: true };
      } else {
        // For JSON, use the existing JSON handling
        return { format, data: await response.json(), isBinary: false };
      }
    },
    onSuccess: ({ format, data, isBinary }) => {
      let blob;
      let mimeType;

      if (isBinary) {
        blob = data;
        mimeType = format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
      } else {
        // JSON format
        blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json'
        });
        mimeType = 'application/json';
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Fix file extensions
      const extension = format === 'excel' ? 'xlsx' : format;
      a.download = `scan-${id}.${extension}`;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64 bg-gray-700" />
          <Skeleton className="h-32 w-full bg-gray-700" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-24 bg-gray-700" />
            <Skeleton className="h-24 bg-gray-700" />
            <Skeleton className="h-24 bg-gray-700" />
          </div>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Scan Not Found</h1>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Use progress data if available, otherwise fall back to scan data
  const currentStatus = progress?.status || scan?.status;
  const currentProgress = progress?.progress || 0;
  const currentStage = progress?.currentStage || '';

  // Merge vulnerabilities from progress if available
  // Prioritize progress data if status is completed to avoid race conditions with DB fetch
  const displayVulnerabilities = (
    (progress?.status === 'completed' && progress?.vulnerabilities)
      ? progress.vulnerabilities
      : (progress?.vulnerabilitiesFound > 0 && progress?.vulnerabilities)
        ? progress.vulnerabilities
        : (scan?.vulnerabilities || [])
  ) as Vulnerability[];

  // Update severity counts based on current vulnerabilities
  const currentSeverityCounts = {
    Critical: displayVulnerabilities.filter((v) => v.severity === "Critical").length,
    High: displayVulnerabilities.filter((v) => v.severity === "High").length,
    Medium: displayVulnerabilities.filter((v) => v.severity === "Medium").length,
    Low: displayVulnerabilities.filter((v) => v.severity === "Low").length,
  };

  const vulnerabilities = (displayVulnerabilities as Vulnerability[]) || [];
  const severityCounts = currentSeverityCounts;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="px-6 py-8 border-b border-gray-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <img
                src="/logo.svg"
                alt="WIKI Security Scanner"
                className="h-8 w-auto"
                onError={(e) => {
                  // Fallback to Shield icon if logo not found
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <Shield className="h-8 w-8 text-green-400 hidden" />

            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => exportMutation.mutate("json")}
              disabled={exportMutation.isPending || currentStatus !== 'completed'}
              className="border-gray-700 hover:border-green-400 text-white bg-transparent hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => exportMutation.mutate("excel")}
              disabled={exportMutation.isPending || currentStatus !== 'completed'}
              className="border-gray-700 hover:border-green-400 text-white bg-transparent hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => exportMutation.mutate("pdf")}
              disabled={exportMutation.isPending || currentStatus !== 'completed'}
              className="border-gray-700 hover:border-green-400 text-white bg-transparent hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* LOADING STATE */}
          {((currentStatus === "scanning" || currentStatus === "crawling" || currentStatus === "pending") ||
            (currentStatus === "completed" && progress?.vulnerabilitiesFound > 0 && vulnerabilities.length === 0)) && (
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="py-16 text-center">
                  <div className="animate-spin w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full mx-auto mb-6"></div>
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    {currentStatus === "crawling" ? "Discovering pages..." :
                      currentStatus === "pending" ? "Initializing scan..." :
                        "Scanning in progress..."}
                  </h2>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto">
                    Please wait while we analyze the target. This may take a few minutes depending on the site size.
                  </p>

                  {currentStage && (
                    <Badge variant="outline" className="mb-6 border-green-400/30 text-green-400 px-4 py-1 text-base">
                      {currentStage}
                    </Badge>
                  )}

                  <div className="w-full max-w-xl mx-auto bg-gray-800 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-green-400 h-full rounded-full transition-all duration-500 ease-out relative"
                      style={{ width: `${Math.max(5, currentProgress)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                  <p className="text-gray-400 mt-4 font-mono">{currentProgress}% complete</p>

                  <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto mt-12 text-center">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-white mb-1">{progress?.pagesScanned || 0}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Pages</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-white mb-1">{progress?.formsFound || 0}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Forms</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-400 mb-1">{progress?.vulnerabilitiesFound || 0}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Vulns</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* COMPLETED STATE */}
          {currentStatus === "completed" && !(progress?.vulnerabilitiesFound > 0 && vulnerabilities.length === 0) && (
            <>
              {/* Scan Summary */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-xl">Scan Results</CardTitle>
                  <p className="text-gray-400">{scan.url}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(severityCounts).map(([severity, count]) => (
                      <div key={severity} className="text-center">
                        <div className="text-2xl font-bold text-white">{count}</div>
                        <div className="text-sm text-gray-400">{severity}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Charts */}
              {vulnerabilities.length > 0 && (
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Vulnerability Distribution</CardTitle>
                    <p className="text-gray-400">Severity Breakdown</p>
                  </CardHeader>
                  <CardContent>
                    <VulnerabilityChart vulnerabilities={vulnerabilities} type="severity" />
                  </CardContent>
                </Card>
              )}

              {/* Vulnerability Details */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Detected Vulnerabilities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {vulnerabilities.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="h-16 w-16 text-green-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">No Vulnerabilities Found</h3>
                      <p className="text-gray-400">This website appears to be secure. Great job!</p>
                    </div>
                  ) : (
                    vulnerabilities.map((vulnerability) => {
                      const Icon = categoryIcons[vulnerability.category as keyof typeof categoryIcons] || Bug;
                      return (
                        <Card key={vulnerability.id} className="bg-gray-800 border-gray-600">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Icon className="h-6 w-6 text-orange-400" />
                                <div>
                                  <CardTitle className="text-white text-lg">{vulnerability.name}</CardTitle>
                                  <Badge
                                    variant="outline"
                                    className={severityColors[vulnerability.severity as keyof typeof severityColors]}
                                  >
                                    {vulnerability.severity} Severity
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                onClick={() => setLocation(`/fix/${vulnerability.id}`)}
                                className="bg-green-400 text-black hover:bg-green-300 hover:scale-105 transition-all duration-200"
                                data-testid={`button-generate-fix-${vulnerability.id}`}
                              >
                                View Fix Details
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <h4 className="font-medium text-white mb-2">Description</h4>
                              <p className="text-gray-400">{vulnerability.description}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-white mb-2">Location</h4>
                              <code className="text-sm bg-black px-2 py-1 rounded text-green-400">
                                {vulnerability.location}
                              </code>
                            </div>
                            <div>
                              <h4 className="font-medium text-white mb-2">Impact</h4>
                              <p className="text-gray-400">{vulnerability.impact}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ERROR STATE */}
          {(currentStatus === "failed" || currentStatus === "error") && (
            <Card className="bg-red-900/20 border-red-500/50">
              <CardContent className="py-12 text-center">
                <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Scan Failed</h3>
                <p className="text-red-200">
                  An error occurred while scanning the target. Please check the URL and try again.
                </p>
                <Button
                  onClick={() => setLocation("/")}
                  className="mt-6 bg-red-500 hover:bg-red-600 text-white"
                >
                  Return Home
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
