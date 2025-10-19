import { useEffect, useState } from "react";

export const AnimatedBackground = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none opacity-30 z-0"
      style={{
        transform: `translateY(${scrollY * 0.3}px)`,
      }}
    >
      {/* Book 1 */}
      <svg className="absolute top-20 left-[10%] w-32 h-32 text-secondary animate-pulse-soft" viewBox="0 0 100 100" style={{ transform: `rotate(${scrollY * 0.05}deg)` }}>
        <rect x="20" y="15" width="60" height="70" rx="3" fill="currentColor" opacity="0.7"/>
        <rect x="25" y="20" width="50" height="3" fill="white" opacity="0.9"/>
        <rect x="25" y="28" width="50" height="2" fill="white" opacity="0.7"/>
        <rect x="25" y="34" width="40" height="2" fill="white" opacity="0.7"/>
      </svg>
      
      {/* Book 2 */}
      <svg className="absolute top-40 right-[15%] w-40 h-40 text-accent animate-pulse-soft" viewBox="0 0 100 100" style={{ transform: `rotate(${-scrollY * 0.04}deg)`, animationDelay: '0.5s' }}>
        <rect x="15" y="20" width="70" height="60" rx="3" fill="currentColor" opacity="0.6"/>
        <rect x="20" y="25" width="60" height="3" fill="white" opacity="0.8"/>
        <rect x="20" y="32" width="55" height="2" fill="white" opacity="0.6"/>
        <rect x="20" y="38" width="50" height="2" fill="white" opacity="0.6"/>
      </svg>

      {/* Book 3 */}
      <svg className="absolute top-[800px] left-[20%] w-36 h-36 text-primary animate-pulse-soft" viewBox="0 0 100 100" style={{ transform: `rotate(${scrollY * 0.06}deg)`, animationDelay: '1s' }}>
        <rect x="18" y="18" width="64" height="64" rx="3" fill="currentColor" opacity="0.65"/>
        <rect x="23" y="23" width="54" height="3" fill="white" opacity="0.85"/>
        <rect x="23" y="30" width="50" height="2" fill="white" opacity="0.65"/>
        <rect x="23" y="36" width="45" height="2" fill="white" opacity="0.65"/>
      </svg>

      {/* Book 4 */}
      <svg className="absolute top-[1200px] right-[25%] w-28 h-28 text-secondary animate-pulse-soft" viewBox="0 0 100 100" style={{ transform: `rotate(${-scrollY * 0.07}deg)`, animationDelay: '1.5s' }}>
        <rect x="22" y="25" width="56" height="50" rx="3" fill="currentColor" opacity="0.55"/>
        <rect x="27" y="30" width="46" height="2" fill="white" opacity="0.8"/>
        <rect x="27" y="36" width="42" height="2" fill="white" opacity="0.6"/>
      </svg>

      {/* Book 5 */}
      <svg className="absolute top-[1600px] left-[15%] w-32 h-32 text-accent animate-pulse-soft" viewBox="0 0 100 100" style={{ transform: `rotate(${scrollY * 0.05}deg)`, animationDelay: '2s' }}>
        <rect x="20" y="15" width="60" height="70" rx="3" fill="currentColor" opacity="0.6"/>
        <rect x="25" y="20" width="50" height="3" fill="white" opacity="0.85"/>
        <rect x="25" y="28" width="50" height="2" fill="white" opacity="0.65"/>
        <rect x="25" y="34" width="40" height="2" fill="white" opacity="0.65"/>
      </svg>

      {/* Book 6 */}
      <svg className="absolute top-[2000px] right-[12%] w-36 h-36 text-primary animate-pulse-soft" viewBox="0 0 100 100" style={{ transform: `rotate(${-scrollY * 0.06}deg)`, animationDelay: '2.5s' }}>
        <rect x="18" y="18" width="64" height="64" rx="3" fill="currentColor" opacity="0.7"/>
        <rect x="23" y="23" width="54" height="3" fill="white" opacity="0.9"/>
        <rect x="23" y="30" width="50" height="2" fill="white" opacity="0.7"/>
        <rect x="23" y="36" width="45" height="2" fill="white" opacity="0.7"/>
      </svg>

      {/* Book 7 */}
      <svg className="absolute top-[2400px] left-[8%] w-28 h-28 text-secondary animate-pulse-soft" viewBox="0 0 100 100" style={{ transform: `rotate(${scrollY * 0.04}deg)`, animationDelay: '3s' }}>
        <rect x="22" y="25" width="56" height="50" rx="3" fill="currentColor" opacity="0.6"/>
        <rect x="27" y="30" width="46" height="2" fill="white" opacity="0.8"/>
        <rect x="27" y="36" width="42" height="2" fill="white" opacity="0.6"/>
      </svg>

      {/* Book 8 */}
      <svg className="absolute top-[2800px] right-[20%] w-40 h-40 text-accent animate-pulse-soft" viewBox="0 0 100 100" style={{ transform: `rotate(${-scrollY * 0.05}deg)`, animationDelay: '3.5s' }}>
        <rect x="15" y="20" width="70" height="60" rx="3" fill="currentColor" opacity="0.65"/>
        <rect x="20" y="25" width="60" height="3" fill="white" opacity="0.85"/>
        <rect x="20" y="32" width="55" height="2" fill="white" opacity="0.65"/>
        <rect x="20" y="38" width="50" height="2" fill="white" opacity="0.65"/>
      </svg>
    </div>
  );
};
