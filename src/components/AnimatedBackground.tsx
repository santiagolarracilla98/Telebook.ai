import { useEffect, useState } from "react";

const Book = ({ x, y, rotation, color, size, delay }: { 
  x: string; 
  y: string; 
  rotation: number; 
  color: string; 
  size: number;
  delay: string;
}) => {
  return (
    <svg 
      className={`absolute ${color} animate-pulse-soft`}
      style={{ 
        left: x, 
        top: y, 
        width: `${size}px`, 
        height: `${size}px`,
        transform: `rotate(${rotation}deg)`,
        animationDelay: delay
      }}
      viewBox="0 0 120 140"
    >
      {/* Book cover */}
      <rect x="25" y="10" width="70" height="120" rx="4" fill="currentColor" opacity="0.85"/>
      
      {/* Book spine shadow */}
      <rect x="25" y="10" width="8" height="120" rx="4" fill="black" opacity="0.2"/>
      
      {/* Pages effect */}
      <rect x="30" y="15" width="60" height="110" fill="white" opacity="0.95"/>
      
      {/* Page lines */}
      <line x1="35" y1="25" x2="85" y2="25" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      <line x1="35" y1="35" x2="85" y2="35" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      <line x1="35" y1="45" x2="75" y2="45" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      <line x1="35" y1="55" x2="85" y2="55" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      <line x1="35" y1="65" x2="80" y2="65" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      <line x1="35" y1="75" x2="85" y2="75" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      <line x1="35" y1="85" x2="70" y2="85" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      
      {/* Book title area on cover */}
      <rect x="30" y="20" width="55" height="30" rx="2" fill="white" opacity="0.4"/>
      
      {/* Book depth/3D effect */}
      <polygon points="95,10 99,14 99,134 95,130" fill="currentColor" opacity="0.6"/>
    </svg>
  );
};

export const AnimatedBackground = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const books = [
    { x: '10%', y: '100px', rotation: scrollY * 0.05, color: 'text-secondary', size: 120, delay: '0s' },
    { x: '85%', y: '300px', rotation: -scrollY * 0.04, color: 'text-accent', size: 140, delay: '0.5s' },
    { x: '20%', y: '600px', rotation: scrollY * 0.06, color: 'text-primary', size: 130, delay: '1s' },
    { x: '75%', y: '900px', rotation: -scrollY * 0.07, color: 'text-secondary', size: 110, delay: '1.5s' },
    { x: '15%', y: '1200px', rotation: scrollY * 0.05, color: 'text-accent', size: 120, delay: '2s' },
    { x: '80%', y: '1500px', rotation: -scrollY * 0.06, color: 'text-primary', size: 135, delay: '2.5s' },
    { x: '8%', y: '1800px', rotation: scrollY * 0.04, color: 'text-secondary', size: 115, delay: '3s' },
    { x: '88%', y: '2100px', rotation: -scrollY * 0.05, color: 'text-accent', size: 140, delay: '3.5s' },
    { x: '25%', y: '2400px', rotation: scrollY * 0.06, color: 'text-primary', size: 125, delay: '4s' },
    { x: '70%', y: '2700px', rotation: -scrollY * 0.04, color: 'text-secondary', size: 130, delay: '4.5s' },
    { x: '12%', y: '3000px', rotation: scrollY * 0.05, color: 'text-accent', size: 120, delay: '5s' },
    { x: '82%', y: '3300px', rotation: -scrollY * 0.06, color: 'text-primary', size: 135, delay: '5.5s' },
  ];

  return (
    <div 
      className="fixed inset-0 pointer-events-none opacity-50 z-0"
      style={{
        transform: `translateY(${scrollY * 0.15}px)`,
      }}
    >
      {books.map((book, index) => (
        <Book key={index} {...book} />
      ))}
    </div>
  );
};
