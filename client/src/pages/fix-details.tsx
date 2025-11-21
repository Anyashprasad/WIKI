import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Copy, Code, AlertTriangle, CheckCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Vulnerability } from "@shared";

const severityColors = {
  Critical: "bg-red-500/10 border-red-500/20 text-red-400",
  High: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  Medium: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  Low: "bg-green-500/10 border-green-500/20 text-green-400",
};

export default function FixDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copySuccess, setCopySuccess] = useState(false);
  const [vulnerability, setVulnerability] = useState<Vulnerability | null>(null);

  // Get vulnerability from scan data (you'll need the scan ID from the vulnerability)
  // For now, we'll use a fallback approach to find the vulnerability
  useEffect(() => {
    const fetchVulnerabilityData = async () => {
      if (!id) return;

      try {
        // Get all scans to find the vulnerability
        const response = await apiRequest("GET", "/api/scans");
        const scans = await response.json();

        // Find the vulnerability across all scans
        for (const scan of scans) {
          const vulnerabilities = scan.vulnerabilities as Vulnerability[] || [];
          const foundVuln = vulnerabilities.find(v => v.id === id);
          if (foundVuln) {
            setVulnerability(foundVuln);
            break;
          }
        }
      } catch (error) {
        console.error("Error fetching vulnerability:", error);
      }
    };

    fetchVulnerabilityData();
  }, [id]);

  const generateFixMutation = useMutation({
    mutationFn: async (vuln: Vulnerability) => {
      const response = await apiRequest("POST", `/api/vulnerabilities/${vuln.id}/fix`, {
        vulnerability: vuln
      });
      return response.json();
    },
    onError: () => {
      toast({
        title: "Fix Generation Failed",
        description: "Unable to generate fix suggestion. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      toast({
        title: "Copied!",
        description: "Fix details copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Handle case where id is undefined or vulnerability not found
  if (!id) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Vulnerability ID</h1>
          <Button onClick={() => setLocation("/")} className="bg-green-400 text-black">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!vulnerability) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading vulnerability details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="px-6 py-8 border-b border-gray-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Scan
            </Button>
            <div className="flex items-center space-x-3">
              <img
                src="/logo.png"
                alt="WIKI Security Scanner"
                className="h-8 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <Shield className="h-8 w-8 text-green-400 hidden" />
              <div>
                <h1 className="text-xl font-bold text-green-400">WIKI</h1>
                <p className="text-gray-400 text-xs">Security Scanner</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Vulnerability Details */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                  <div>
                    <CardTitle className="text-white text-xl">{vulnerability.name}</CardTitle>
                    <p className="text-gray-400 text-sm">Vulnerability Details</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={severityColors[vulnerability.severity]}
                >
                  {vulnerability.severity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-white mb-2">Description</h4>
                <p className="text-gray-400">{vulnerability.description}</p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">Location</h4>
                <code className="text-sm bg-black px-3 py-2 rounded text-green-400 block">
                  {vulnerability.location}
                </code>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">Impact</h4>
                <p className="text-gray-400">{vulnerability.impact}</p>
              </div>
            </CardContent>
          </Card>

          {/* AI Fix Generation */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Code className="h-5 w-5 text-green-400" />
                  AI-Generated Fix
                </CardTitle>
                {!generateFixMutation.data && (
                  <Button
                    onClick={() => generateFixMutation.mutate(vulnerability)}
                    disabled={generateFixMutation.isPending}
                    className="bg-green-400 text-black hover:bg-green-300"
                  >
                    {generateFixMutation.isPending ? "Generating..." : "Generate Fix"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generateFixMutation.isPending && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="animate-spin w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full"></div>
                    <span>AI is analyzing the vulnerability...</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-800 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-800 rounded animate-pulse w-4/5"></div>
                    <div className="h-4 bg-gray-800 rounded animate-pulse w-3/5"></div>
                  </div>
                </div>
              )}

              {generateFixMutation.data && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span>Fix Generated Successfully</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(generateFixMutation.data.fix)}
                      className="text-gray-400 border-gray-600 hover:bg-gray-800"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copySuccess ? 'Copied!' : 'Copy Fix'}
                    </Button>
                  </div>
                  <div className="bg-black border border-gray-600 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-gray-300 font-mono text-sm leading-relaxed overflow-x-auto">
                      {generateFixMutation.data.fix}
                    </pre>
                  </div>
                </div>
              )}

              {generateFixMutation.error && (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <p className="text-gray-400">Failed to generate fix. Please try again.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
