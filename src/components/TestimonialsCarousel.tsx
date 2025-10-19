import { Card } from "@/components/ui/card";
import { Play } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const VideoTestimonial = ({ videoUrl, id }: { videoUrl: string; id: number }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && !isPlaying) {
      videoRef.current.muted = true;
      videoRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current && !isPlaying) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleClick = () => {
    if (videoRef.current && !isPlaying) {
      setIsPlaying(true);
      videoRef.current.muted = false;
      videoRef.current.controls = true;
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  return (
    <div 
      className="relative group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <video
        ref={videoRef}
        className="w-full aspect-video object-cover rounded-xl"
        preload="metadata"
        controls={isPlaying}
        playsInline
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-xl transition-opacity duration-300 hover:bg-black/15">
          <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center shadow-2xl transform transition-transform duration-300 group-hover:scale-110">
            <Play className="w-10 h-10 text-white fill-white/80 ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

export const TestimonialsCarousel = () => {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const testimonials = [
    {
      videoUrl: "/videos/testimonial-1.mp4",
      id: 1
    },
    {
      videoUrl: "/videos/testimonial-2.mp4",
      id: 2
    },
    {
      videoUrl: "/videos/testimonial-3.mp4",
      id: 3
    }
  ];

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
    <section className="py-24 px-4 bg-gradient-to-b from-muted/20 via-background to-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="font-headline text-4xl md:text-5xl font-bold mb-6 text-primary tracking-tight">
            Trusted by Top Amazon Book Sellers
          </h2>
          <p className="font-body text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Hear from professional sellers who unlocked new levels of profitability.
          </p>
        </div>

        <div
          ref={scrollRef}
          className="overflow-hidden relative w-full max-w-6xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="flex gap-4 w-fit">
            {/* Duplicate testimonials for seamless loop */}
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <div key={`${testimonial.id}-${index}`} className="w-[220px] flex-shrink-0">
                <Card className="border-2 border-border/30 overflow-hidden bg-card shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300 rounded-lg">
                  <VideoTestimonial videoUrl={testimonial.videoUrl} id={testimonial.id} />
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
