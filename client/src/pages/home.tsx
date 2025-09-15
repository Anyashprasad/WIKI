import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Shield, Globe, MessageCircle, FileText, Bug, Bot, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import LoadingModal from "@/components/loading-modal";
import type { InsertScan, InsertChatMessage } from "@shared/schema";

const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

export default function Home() {
  const [input, setInput] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const wikiRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const scanMutation = useMutation({
    mutationFn: async (data: InsertScan) => {
      const response = await apiRequest("POST", "/api/scans", data);
      return response.json();
    },
    onSuccess: (scan) => {
      setLocation(`/scan/${scan.id}`);
    },
    onError: () => {
      toast({
        title: "Scan Failed",
        description: "Unable to start vulnerability scan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (data: InsertChatMessage) => {
      const response = await apiRequest("POST", "/api/chat", data);
      return response.json();
    },
    onSuccess: (message) => {
      toast({
        title: "AI Response Generated",
        description: "Security question answered successfully.",
      });
      // Show response in a modal or navigate to chat page
      alert(message.response); // Temporary - replace with proper UI
    },
    onError: () => {
      toast({
        title: "Chat Failed",
        description: "Unable to process security question. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (urlRegex.test(trimmedInput)) {
      // URL detected - start scan
      let url = trimmedInput;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      scanMutation.mutate({ url });
    } else {
      // Text detected - start security chat
      chatMutation.mutate({ message: trimmedInput });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (wikiRef.current) {
        const rect = wikiRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    const wikiElement = wikiRef.current;
    if (wikiElement) {
      wikiElement.addEventListener('mousemove', handleMouseMove);
      return () => wikiElement.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  const getLetterProximity = (index: number) => {
    if (!wikiRef.current) return 'far';
    
    const letters = wikiRef.current.children;
    if (!letters[index]) return 'far';
    
    const letterRect = letters[index].getBoundingClientRect();
    const wikiRect = wikiRef.current.getBoundingClientRect();
    
    const letterCenterX = letterRect.left + letterRect.width / 2 - wikiRect.left;
    const letterCenterY = letterRect.top + letterRect.height / 2 - wikiRect.top;
    
    const distance = Math.sqrt(
      Math.pow(mousePos.x - letterCenterX, 2) + 
      Math.pow(mousePos.y - letterCenterY, 2)
    );
    
    if (distance < 80) return 'active';
    if (distance < 150) return 'near';
    return 'far';
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-white">
      {/* Header */}
      <header className="border-b border-border-dark bg-card-bg/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-hacker-green rounded-lg flex items-center justify-center">
                <Shield className="text-dark-bg text-lg" size={18} />
              </div>
              <h1 className="text-xl font-bold terminal-font">
                <span className="text-hacker-green">WIKI</span> Security Scanner
              </h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="#" className="text-gray-300 hover-text-hacker-green transition-colors duration-200 cursor-pointer-custom" data-testid="nav-scanner">
                Scanner
              </a>
              <a href="#" className="text-gray-300 hover-text-hacker-green transition-colors duration-200 cursor-pointer-custom" data-testid="nav-chat">
                Chat
              </a>
              <a href="#" className="text-gray-300 hover-text-hacker-green transition-colors duration-200 cursor-pointer-custom" data-testid="nav-docs">
                Docs
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              Secure Your Web <span className="text-hacker-green terminal-font">Applications</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-lg mx-auto">
              Professional vulnerability scanning and security analysis powered by AI
            </p>
          </div>

          {/* Input Section */}
          <div className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Enter a URL to scan or ask a security question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-6 py-4 bg-card-bg border border-border-dark text-white placeholder-gray-400 text-lg glow-effect focus:ring-2 focus:ring-hacker-green focus:border-hacker-green transition-all duration-200 cursor-text-custom"
                data-testid="input-main"
              />
              <Button
                onClick={handleSubmit}
                disabled={scanMutation.isPending || chatMutation.isPending}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-hacker-green hover-bg-hacker-green-80 text-dark-bg rounded-lg transition-all duration-200 hover:scale-110 p-0 cursor-pointer-custom"
                data-testid="button-submit"
              >
                →
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-card-bg border-border-dark text-gray-300 hover-text-hacker-green hover-border-hacker-green hover:scale-105 transition-all duration-200 cursor-pointer-custom"
                data-testid="button-scan-website"
              >
                <Globe className="mr-2" size={16} />
                Scan Website
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-card-bg border-border-dark text-gray-300 hover-text-hacker-green hover-border-hacker-green hover:scale-105 transition-all duration-200 cursor-pointer-custom"
                data-testid="button-security-chat"
              >
                <MessageCircle className="mr-2" size={16} />
                Security Chat
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-card-bg border-border-dark text-gray-300 hover-text-hacker-green hover-border-hacker-green hover:scale-105 transition-all duration-200 cursor-pointer-custom"
                data-testid="button-view-report"
              >
                <FileText className="mr-2" size={16} />
                View Report
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card className="bg-card-bg border-border-dark hover:border-hacker-green transition-all duration-300 hover:scale-105 glow-effect interactive-element">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-hacker-green/20 rounded-lg flex items-center justify-center mb-4">
                  <Bug className="text-hacker-green text-xl" />
                </div>
                <h3 className="text-lg font-semibold mb-2" data-testid="feature-vulnerability-title">Vulnerability Detection</h3>
                <p className="text-gray-400 text-sm" data-testid="feature-vulnerability-description">
                  Advanced scanning for SQLi, XSS, CSRF, and API vulnerabilities
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card-bg border-border-dark hover:border-hacker-green transition-all duration-300 hover:scale-105 glow-effect interactive-element">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-hacker-green/20 rounded-lg flex items-center justify-center mb-4">
                  <Bot className="text-hacker-green text-xl" />
                </div>
                <h3 className="text-lg font-semibold mb-2" data-testid="feature-ai-title">AI-Powered Analysis</h3>
                <p className="text-gray-400 text-sm" data-testid="feature-ai-description">
                  Intelligent explanations and remediation suggestions
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card-bg border-border-dark hover:border-hacker-green transition-all duration-300 hover:scale-105 glow-effect interactive-element">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-hacker-green/20 rounded-lg flex items-center justify-center mb-4">
                  <PieChart className="text-hacker-green text-xl" />
                </div>
                <h3 className="text-lg font-semibold mb-2" data-testid="feature-reports-title">Detailed Reports</h3>
                <p className="text-gray-400 text-sm" data-testid="feature-reports-description">
                  Export comprehensive reports in PDF and JSON formats
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-dark bg-card-bg/30 backdrop-blur-sm mega-footer">
        {/* Large WIKI Text */}
        <div className="relative py-20 overflow-hidden">
          <div className="text-center">
            <div 
              ref={wikiRef}
              className="mega-text terminal-font" 
              data-testid="mega-wiki-text"
            >
              {['W', 'I', 'K', 'I'].map((letter, index) => (
                <span 
                  key={index}
                  className={`mega-letter ${getLetterProximity(index)}`}
                >
                  {letter}
                </span>
              ))}
            </div>
            <p className="text-2xl text-gray-300 mt-4 font-light">Security Intelligence</p>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 interactive-element">
                <div className="w-6 h-6 bg-hacker-green rounded flex items-center justify-center">
                  <Shield className="text-dark-bg text-sm" size={14} />
                </div>
                <span className="font-bold terminal-font text-hacker-green">WIKI</span>
              </div>
              <p className="text-gray-400 text-sm">Professional security scanning for modern web applications</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-hacker-green cursor-pointer-custom">Scanner</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover-text-hacker-green transition-colors cursor-pointer-custom">SQL Injection</a></li>
                <li><a href="#" className="hover-text-hacker-green transition-colors cursor-pointer-custom">XSS Detection</a></li>
                <li><a href="#" className="hover-text-hacker-green transition-colors cursor-pointer-custom">API Testing</a></li>
                <li><a href="#" className="hover-text-hacker-green transition-colors cursor-pointer-custom">CSRF Analysis</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-hacker-green cursor-pointer-custom">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover-text-hacker-green transition-colors cursor-pointer-custom">Documentation</a></li>
                <li><a href="#" className="hover-text-hacker-green transition-colors cursor-pointer-custom">API Reference</a></li>
                <li><a href="#" className="hover-text-hacker-green transition-colors cursor-pointer-custom">Security Guide</a></li>
                <li><a href="#" className="hover-text-hacker-green transition-colors cursor-pointer-custom">Best Practices</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-hacker-green cursor-pointer-custom">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="w-8 h-8 bg-border-dark rounded-lg flex items-center justify-center hover:bg-hacker-green hover:text-dark-bg transition-all duration-200 hover:scale-110 interactive-element">
                  <span className="text-sm">G</span>
                </a>
                <a href="#" className="w-8 h-8 bg-border-dark rounded-lg flex items-center justify-center hover:bg-hacker-green hover:text-dark-bg transition-all duration-200 hover:scale-110 interactive-element">
                  <span className="text-sm">T</span>
                </a>
                <a href="#" className="w-8 h-8 bg-border-dark rounded-lg flex items-center justify-center hover:bg-hacker-green hover:text-dark-bg transition-all duration-200 hover:scale-110 interactive-element">
                  <span className="text-sm">D</span>
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border-dark mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm terminal-font">
              © 2024 WIKI Security Scanner. <span className="text-hacker-green cursor-pointer-custom">Powered by AI</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Loading Modal */}
      {scanMutation.isPending && <LoadingModal url={input} />}
    </div>
  );
}
