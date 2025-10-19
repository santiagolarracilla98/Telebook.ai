import { Card } from "@/components/ui/card";
import { Play } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const VideoTestimonial = ({ videoUrl, id, onPlay }: { videoUrl: string; id: number; onPlay: (id: number) => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const expandedVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Pause this video if another video is playing
    const handleOtherVideoPlay = (event: CustomEvent) => {
      if (event.detail.id !== id && isExpanded) {
        setIsExpanded(false);
        if (expandedVideoRef.current) {
          expandedVideoRef.current.pause();
          expandedVideoRef.current.currentTime = 0;
        }
      }
    };

    window.addEventListener('videoPlaying', handleOtherVideoPlay as EventListener);
    return () => window.removeEventListener('videoPlaying', handleOtherVideoPlay as EventListener);
  }, [id, isExpanded]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && !isExpanded) {
      videoRef.current.muted = true;
      videoRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current && !isExpanded) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      onPlay(id);
      // Dispatch custom event to notify other videos
      window.dispatchEvent(new CustomEvent('videoPlaying', { detail: { id } }));
    }
  };

  const handleDialogClose = () => {
    setIsExpanded(false);
    if (expandedVideoRef.current) {
      expandedVideoRef.current.pause();
      expandedVideoRef.current.currentTime = 0;
    }
  };

  return (
    <>
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
          playsInline
          muted
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-xl transition-opacity duration-300 hover:bg-black/15">
          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-xl transform transition-transform duration-300 group-hover:scale-110">
            <Play className="w-10 h-10 text-white/60 fill-white/60 ml-1" />
          </div>
        </div>
      </div>

      <Dialog open={isExpanded} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
          <video
            ref={expandedVideoRef}
            className="w-full aspect-video object-cover rounded-xl"
            controls
            autoPlay
            playsInline
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const TestimonialsCarousel = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
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
        scrollPosition += 0.3; // Reduced from 0.5 to 0.3 for slower scrolling
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

  const handleVideoPlay = (id: number) => {
    setPlayingVideoId(id);
  };

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
                  <VideoTestimonial 
                    videoUrl={testimonial.videoUrl} 
                    id={testimonial.id}
                    onPlay={handleVideoPlay}
                  />
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
