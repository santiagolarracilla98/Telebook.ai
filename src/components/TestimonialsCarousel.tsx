import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Play } from "lucide-react";
import { useState, useRef } from "react";

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
          <div className="w-20 h-20 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center shadow-2xl transform transition-transform duration-300 group-hover:scale-110">
            <Play className="w-10 h-10 text-white fill-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

export const TestimonialsCarousel = () => {
  const testimonials = [
    {
      videoUrl: "/videos/testimonial-1.mp4",
      id: 1
    },
    {
      videoUrl: "/videos/testimonial-2.mp4",
      id: 2
    }
  ];

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

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-5xl mx-auto"
        >
          <CarouselContent>
            {testimonials.map((testimonial) => (
              <CarouselItem key={testimonial.id} className="md:basis-1/2 lg:basis-1/2">
                <div className="p-3">
                  <Card className="border-2 border-border/30 overflow-hidden bg-card shadow-xl hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 rounded-2xl">
                    <VideoTestimonial videoUrl={testimonial.videoUrl} id={testimonial.id} />
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0 -translate-x-12 glass-strong border-2 border-border/20 hover:border-primary/30 shadow-lg hover:shadow-xl transition-all" />
          <CarouselNext className="right-0 translate-x-12 glass-strong border-2 border-border/20 hover:border-primary/30 shadow-lg hover:shadow-xl transition-all" />
        </Carousel>
      </div>
    </section>
  );
};
