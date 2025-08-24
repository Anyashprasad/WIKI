import { useState, useEffect } from "react";
import { Search, Check, Clock } from "lucide-react";

interface LoadingModalProps {
  url: string;
}

const scanSteps = [
  { id: 1, name: "SQL Injection scan", icon: Check },
  { id: 2, name: "XSS vulnerability detection", icon: null },
  { id: 3, name: "CSRF analysis", icon: Clock },
  { id: 4, name: "API endpoint testing", icon: Clock },
  { id: 5, name: "Load testing", icon: Clock },
];

export default function LoadingModal({ url }: LoadingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
      
      if (currentStep < scanSteps.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStep]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" data-testid="loading-modal">
      <div className="bg-card-bg border border-border-dark rounded-xl p-8 max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-hacker-green/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Search className="text-hacker-green text-2xl" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2" data-testid="loading-title">Scanning Target</h3>
            <p className="text-gray-400 text-sm terminal-font" data-testid="loading-url">{url}</p>
          </div>
          
          <div className="space-y-3">
            <div className="w-full bg-border-dark rounded-full h-2 overflow-hidden">
              <div 
                className="scan-animation h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-400" data-testid="loading-status">
              {scanSteps[currentStep]?.name || "Completing scan..."}...
            </p>
          </div>
          
          {/* Scan Progress Steps */}
          <div className="space-y-2 text-left">
            {scanSteps.map((step, index) => {
              let Icon = step.icon || Clock;
              let iconClass = "text-gray-500";
              
              if (index < currentStep) {
                Icon = Check;
                iconClass = "text-hacker-green";
              } else if (index === currentStep) {
                iconClass = "text-hacker-green";
              }

              return (
                <div key={step.id} className="flex items-center space-x-3" data-testid={`scan-step-${step.id}`}>
                  {index === currentStep && step.icon === null ? (
                    <div className="w-4 h-4 border-2 border-hacker-green border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Icon className={`w-4 h-4 ${iconClass}`} />
                  )}
                  <span className={`text-sm ${index <= currentStep ? 'text-gray-300' : 'text-gray-500'}`}>
                    {step.name} {index < currentStep && 'completed'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
