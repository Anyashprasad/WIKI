import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

interface LetterPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function Footer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [letterPositions, setLetterPositions] = useState<LetterPosition[]>([]);
  const [isHovering, setIsHovering] = useState(false);

  const text = "WIKI Security Intelligence";
  const letters = text.split('');

  useEffect(() => {
    const updateLetterPositions = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const letters = container.querySelectorAll('.interactive-letter');
      const containerRect = container.getBoundingClientRect();
      
      const positions: LetterPosition[] = [];
      letters.forEach((letter) => {
        const rect = letter.getBoundingClientRect();
        positions.push({
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
          width: rect.width,
          height: rect.height
        });
      });
      
      setLetterPositions(positions);
    };

    updateLetterPositions();
    window.addEventListener('resize', updateLetterPositions);
    
    return () => window.removeEventListener('resize', updateLetterPositions);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const getLetterIntensity = (index: number) => {
    if (!isHovering || letterPositions.length === 0) return 0;
    
    const letterPos = letterPositions[index];
    if (!letterPos) return 0;
    
    const distance = Math.sqrt(
      Math.pow(mousePos.x - letterPos.x, 2) + 
      Math.pow(mousePos.y - letterPos.y, 2)
    );
    
    // Create a smooth falloff with larger radius for wave effect
    const maxDistance = 150;
    const intensity = Math.max(0, 1 - (distance / maxDistance));
    
    // Apply easing curve for smoother falloff
    return Math.pow(intensity, 0.6);
  };

  const getGlowStyle = (intensity: number) => {
    const glowColor = '#00ff88';
    const baseOpacity = 0.3;
    const maxOpacity = 1;
    
    const opacity = baseOpacity + (maxOpacity - baseOpacity) * intensity;
    const shadowBlur = 5 + (intensity * 25);
    const scale = 1 + (intensity * 0.1);
    
    return {
      color: glowColor,
      opacity,
      textShadow: `
        0 0 ${shadowBlur * 0.5}px ${glowColor}40,
        0 0 ${shadowBlur}px ${glowColor}60,
        0 0 ${shadowBlur * 2}px ${glowColor}40,
        0 0 ${shadowBlur * 4}px ${glowColor}20
      `,
      transform: `scale(${scale})`,
    };
  };

  return (
    <footer className="border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
      {/* Interactive Text Section */}
      <div className="relative py-16 md:py-24 overflow-hidden bg-gray-900">
        <div className="text-center">
          <div
            ref={containerRef}
            className="relative inline-block cursor-none select-none"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            data-testid="interactive-footer-text"
          >
            <div className="flex flex-wrap justify-center items-center gap-x-1 md:gap-x-2">
              {letters.map((letter, index) => {
                const intensity = getLetterIntensity(index);
                const isSpace = letter === ' ';
                
                return (
                  <motion.span
                    key={index}
                    className={`interactive-letter inline-block font-black text-4xl sm:text-6xl md:text-8xl lg:text-9xl ${
                      isSpace ? 'w-4 md:w-8' : ''
                    }`}
                    style={isSpace ? {} : getGlowStyle(intensity)}
                    animate={isSpace ? {} : {
                      scale: 1 + (intensity * 0.1),
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      mass: 0.8
                    }}
                  >
                    {isSpace ? ' ' : letter}
                  </motion.span>
                );
              })}
            </div>
          </div>
          
          <motion.p 
            className="text-lg md:text-2xl text-gray-400 mt-4 md:mt-8 font-light"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Professional Security Analysis Platform
          </motion.p>
        </div>
      </div>
      
      {/* Footer Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#00ff88] rounded-lg flex items-center justify-center">
                <Shield className="text-gray-900 text-lg" size={18} />
              </div>
              <span className="font-bold text-xl text-[#00ff88]">WIKI</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Advanced security scanning and vulnerability assessment for modern web applications.
            </p>
          </div>
          
          {/* Scanner Features */}
          <div>
            <h4 className="font-semibold mb-6 text-[#00ff88] text-lg">Scanner</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              {['SQL Injection', 'XSS Detection', 'API Testing', 'CSRF Analysis'].map((item, index) => (
                <li key={index}>
                  <a 
                    href="#" 
                    className="hover:text-[#00ff88] transition-colors duration-200 cursor-pointer block py-1"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-6 text-[#00ff88] text-lg">Resources</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              {['Documentation', 'API Reference', 'Security Guide', 'Best Practices'].map((item, index) => (
                <li key={index}>
                  <a 
                    href="#" 
                    className="hover:text-[#00ff88] transition-colors duration-200 cursor-pointer block py-1"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Social Links */}
          <div>
            <h4 className="font-semibold mb-6 text-[#00ff88] text-lg">Connect</h4>
            <div className="flex space-x-4">
              {['G', 'T', 'D'].map((letter, index) => (
                <motion.a
                  key={index}
                  href="#"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:bg-[#00ff88] hover:text-gray-900 transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-sm font-semibold">{letter}</span>
                </motion.a>
              ))}
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <motion.div 
          className="border-t border-gray-800 mt-8 md:mt-12 pt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <p className="text-gray-400 text-sm">
            © 2024 WIKI Security Scanner. 
            <span className="text-[#00ff88] ml-2 cursor-pointer hover:brightness-125 transition-all">
              Powered by AI
            </span>
          </p>
        </motion.div>
      </div>
    </footer>
  );
}