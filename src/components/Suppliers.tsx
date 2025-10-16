import { useEffect, useRef, useState } from "react";
import penguinLogo from "@/assets/logo-penguin.png";
import hachetteLogo from "@/assets/logo-hachette.png";
import harpercollinsLogo from "@/assets/logo-harpercollins.png";
import macmillanLogo from "@/assets/logo-macmillan.png";
import simonschusterLogo from "@/assets/logo-simonschuster.png";
import pearsonLogo from "@/assets/logo-pearson.png";

const suppliers = [
  { name: "Penguin Random House", logo: penguinLogo },
  { name: "Hachette", logo: hachetteLogo },
  { name: "Harper Collins", logo: harpercollinsLogo },
  { name: "Macmillan", logo: macmillanLogo },
  { name: "Simon & Schuster", logo: simonschusterLogo },
  { name: "Pearson Education", logo: pearsonLogo },
];

const Suppliers = () => {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPosition = 0;

    const scroll = () => {
      if (!isPaused && scrollContainer) {
        scrollPosition += 0.5;
        if (scrollPosition >= scrollContainer.scrollWidth / 2) {
          scrollPosition = 0;
        }
        scrollContainer.scrollLeft = scrollPosition;
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationId);
  }, [isPaused]);

  return (
    <section id="suppliers" className="py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Our Trusted Publishers</h2>
          <p className="text-muted-foreground">
            We partner with leading publishers to bring you quality books
          </p>
        </div>

        <div
          ref={scrollRef}
          className="overflow-hidden relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="flex gap-16 w-fit">
            {/* Duplicate the suppliers array to create seamless loop */}
            {[...suppliers, ...suppliers, ...suppliers].map((supplier, index) => (
              <div
                key={`${supplier.name}-${index}`}
                className="flex items-center justify-center min-w-[200px] h-24 px-6 rounded-lg bg-background border border-border grayscale hover:grayscale-0 hover:shadow-md transition-all duration-300"
              >
                <img
                  src={supplier.logo}
                  alt={supplier.name}
                  className="max-h-16 max-w-[180px] object-contain mix-blend-multiply dark:mix-blend-normal dark:invert"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Suppliers;
