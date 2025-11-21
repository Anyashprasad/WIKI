
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bug, Bot, PieChart } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import type { InsertScan } from "../../shared";

const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;

/**
 * Main Home component for the SecureScan application.
 * Handles the URL input and initiates the vulnerability scan.
 */
export default function Home() {
  const [input, setInput] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Mutation hook for initiating a vulnerability scan.
   * On success, navigates to the scan results page.
   * On error, displays a toast notification.
   */
  const scanMutation = useMutation({
    mutationFn: async (data: InsertScan) => {
      // Mutation to create a new scan session
      const res = await apiRequest("POST", "/api/scans", data);
      return res.json();
    },
    onSuccess: (scan) => {
      // Navigate to results page immediately
      setLocation(`/ scan / ${scan.id} `);
    },
    onError: (error) => {
      console.error("Scan mutation error:", error); // Debug log
      toast({
        title: "Scan Failed",
        description: "Unable to start vulnerability scan. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Invalidate scans query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
    },
  });

  const handleSubmit = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || !urlRegex.test(trimmedInput)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL to scan.",
        variant: "destructive",
      });
      return;
    }

    let url = trimmedInput;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    console.log("Submitting scan for URL:", url); // Debug log
    scanMutation.mutate({ url });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      {/* Header */}
      <header className="relative z-10 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/logo.svg"
                alt="WIKI Security Scanner"
                className="h-12 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  // Fallback could be added here if needed
                }}
              />
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/">
                <a className="text-green-400 transition-colors cursor-pointer">Scanner</a>
              </Link>
              <Link href="/about">
                <a className="text-white hover:text-green-400 transition-colors cursor-pointer">About Me</a>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 px-6 py-12">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h2 variants={itemVariants} className="text-5xl md:text-6xl font-bold mb-6 text-white">
            Secure Your Web{" "}
            <span className="text-green-400">Applications</span>
          </motion.h2>
          <motion.p variants={itemVariants} className="text-xl text-gray-300 mb-12">
            Your 10x Pentesting AI Assistant
          </motion.p>

          {/* URL Input */}
          <motion.div variants={itemVariants} className="max-w-2xl mx-auto mb-12">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter a URL to scan for vulnerabilities..."
                className="flex-1 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 h-14 text-lg backdrop-blur-sm"
                disabled={scanMutation.isPending}
              />
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || scanMutation.isPending}
                className="bg-green-400 text-black hover:bg-green-300 h-14 px-8 font-semibold transition-all duration-200 hover:scale-105"
              >
                {scanMutation.isPending ? "Scanning..." : "→"}
              </Button>
            </div>
          </motion.div>

          {/* Feature Cards - Fixed text colors */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-gray-900 border-gray-700 hover:bg-gray-800/70 transition-all duration-200 hover:scale-105">
              <CardContent className="p-8 text-center">
                <div className="p-4 bg-green-400/20 rounded-full w-fit mx-auto mb-4">
                  <Bug className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Vulnerability Detection</h3>
                <p className="text-white leading-relaxed">
                  Advanced scanning for SQL, XSS, CSRF, and Information Disclosure
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700 hover:bg-gray-800/70 transition-all duration-200 hover:scale-105">
              <CardContent className="p-8 text-center">
                <div className="p-4 bg-green-400/20 rounded-full w-fit mx-auto mb-4">
                  <Bot className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">AI-Powered Fixes</h3>
                <p className="text-white leading-relaxed">
                  Intelligent remediation suggestions with code examples
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700 hover:bg-gray-800/70 transition-all duration-200 hover:scale-105">
              <CardContent className="p-8 text-center">
                <div className="p-4 bg-green-400/20 rounded-full w-fit mx-auto mb-4">
                  <PieChart className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Detailed Reports</h3>
                <p className="text-white leading-relaxed">
                  Export comprehensive reports in PDF and JSON formats
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Performance Stats */}
          <motion.div variants={itemVariants} className="mt-12 p-6 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-center text-green-400">Performance Improvements</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-white">~7.5 min</p>
                <p className="text-sm text-gray-400">Previous Scan Time</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-400">~24 sec</p>
                <p className="text-sm text-gray-400">New Scan Time</p>
              </div>
            </div>
            <p className="text-center text-sm text-gray-300 mt-4">
              31x faster with multithreaded architecture
            </p>
          </motion.div>
        </motion.div>
      </main>



      {/* Footer */}
      <Footer />
    </div>
  );
}
