import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Linkedin } from "lucide-react";

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
  const [showGiantFooter, setShowGiantFooter] = useState(false);

  const text = "WIKI";
  const letters = text.split('');

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Calculate how close to bottom we are
      const scrollBottom = scrollY + windowHeight;
      const scrollPercentage = (scrollBottom / documentHeight) * 100;

      // Show footer when scrolled 80% down the page
      setShowGiantFooter(scrollPercentage > 80);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!showGiantFooter) return;

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

    const timeout = setTimeout(updateLetterPositions, 500);
    window.addEventListener('resize', updateLetterPositions);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateLetterPositions);
    };
  }, [showGiantFooter]);

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

    const maxDistance = 150;
    const intensity = Math.max(0, 1 - (distance / maxDistance));

    return Math.pow(intensity, 0.6);
  };

  const getGlowStyle = (intensity: number) => {
    const glowColor = '#ffffff';
    const baseColor = '#000000';
    const shadowBlur = 5 + (intensity * 30);
    const scale = 1 + (intensity * 0.12);

    return {
      color: baseColor,
      textShadow: intensity > 0.1 ? `
        0 0 ${shadowBlur * 0.5}px ${glowColor}90,
        0 0 ${shadowBlur}px ${glowColor}70,
        0 0 ${shadowBlur * 1.5}px ${glowColor}50,
        0 0 ${shadowBlur * 2.5}px ${glowColor}30
      ` : 'none',
      transform: `scale(${scale})`,
      transition: 'all 0.15s ease-out'
    };
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Spacer div to ensure page has enough height to scroll */}
      <div className="min-h-[200vh]"></div>

      {/* Giant Full-Screen Footer */}
      <AnimatePresence>
        {showGiantFooter && (
          <motion.div
            initial={{ y: '100vh' }}
            animate={{ y: 0 }}
            exit={{ y: '100vh' }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed bottom-0 left-0 w-full h-screen bg-gray-900 z-50 flex flex-col pointer-events-auto"
          >
            {/* Top section */}
            <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-3 items-center border-b border-gray-800 gap-4 md:gap-0">
              <div className="text-sm text-gray-400 text-center md:text-left">
                ©2025 WIKI. All rights reserved.
              </div>

              <div className="flex items-center justify-center space-x-4">
                <a href="https://github.com/Anyashprasad" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                  <Github size={20} />
                </a>
                <a href="https://www.linkedin.com/in/anyash-prasad-03699a284/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                  <Linkedin size={20} />
                </a>
              </div>

              <div className="flex justify-center md:justify-end">
                <button
                  onClick={scrollToTop}
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 hover:bg-gray-800 px-3 py-1 rounded"
                >
                  Back to top
                  <span className="text-lg">↑</span>
                </button>
              </div>
            </div>

            {/* Giant WIKI section */}
            <div className="flex-1 bg-green-400 flex items-center justify-center">
              <div
                ref={containerRef}
                className="cursor-default select-none"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <div className="flex items-center justify-center">
                  {letters.map((letter, index) => (
                    <motion.span
                      key={index}
                      className="interactive-letter text-black font-black text-8xl md:text-9xl lg:text-[12rem] xl:text-[15rem] leading-none"
                      style={getGlowStyle(getLetterIntensity(index))}
                      initial={{ scale: 0, opacity: 0, rotateY: 90 }}
                      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                      transition={{
                        duration: 0.6,
                        delay: 0.3 + (index * 0.1),
                        ease: "backOut"
                      }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

