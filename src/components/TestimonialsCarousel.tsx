import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
          <h2 className="font-headline text-4xl md:text-5xl font-bold mb-6 text-foreground tracking-tight">
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
                    <video
                      controls
                      className="w-full aspect-video object-cover"
                      preload="metadata"
                    >
                      <source src={testimonial.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
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
