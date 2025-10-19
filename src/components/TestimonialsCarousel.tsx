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
    <section className="py-16 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Trusted by Top Amazon Book Sellers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
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
                <div className="p-2">
                  <Card className="border-border/50 overflow-hidden bg-card">
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
          <CarouselPrevious className="left-0 -translate-x-12" />
          <CarouselNext className="right-0 translate-x-12" />
        </Carousel>
      </div>
    </section>
  );
};
