import { cn } from "@/lib/utils"
import { TestimonialCard, TestimonialAuthor } from "@/components/ui/testimonial-card"

interface TestimonialsSectionProps {
  title: string
  description: string
  testimonials: Array<{
    author: TestimonialAuthor
    text: string
    href?: string
  }>
  className?: string
  dark?: boolean
  compact?: boolean
  showHeader?: boolean
  as?: "section" | "div"
}

export function TestimonialsSection({ 
  title,
  description,
  testimonials,
  className,
  dark = false,
  compact = false,
  showHeader = true,
  as = "section",
}: TestimonialsSectionProps) {
  const Root = as

  return (
    <Root className={cn(
      dark ? "bg-transparent text-white" : "bg-[#f8fafb] text-[#0f172a]",
      compact ? "px-0 py-0" : "px-0 py-16 sm:py-24 md:py-28",
      className
    )}>
      <div className={cn("mx-auto flex w-full max-w-[1200px] flex-col items-center text-center", compact ? "gap-5 sm:gap-6" : "gap-8 sm:gap-14")}>
        {showHeader ? (
          <div className={cn("flex flex-col items-center gap-4 px-4", compact ? "sm:gap-4" : "sm:gap-6")}>
            <span className={cn("text-xs font-extrabold uppercase tracking-[0.22em]", dark ? "text-[#c8a96e]" : "text-[#2563eb]")}>
              Testimonios
            </span>
            <h2 className={cn("max-w-[820px] font-semibold leading-tight tracking-[-0.04em]", compact ? "text-2xl sm:text-4xl" : "text-3xl sm:text-5xl sm:leading-tight")}>
              {title}
            </h2>
            <p className={cn("max-w-[700px] font-medium leading-8", dark ? "text-slate-400" : "text-slate-500", compact ? "text-sm sm:text-lg" : "text-base sm:text-xl")}>
              {description}
            </p>
          </div>
        ) : null}

        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
          <div
            className={cn(
              "group flex w-full px-3 sm:px-4 [--gap:0.875rem] sm:[--gap:1rem] [gap:var(--gap)] [--duration:42s]",
              "overflow-hidden",
              compact ? "py-1" : "py-2",
            )}
          >
            <div className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused]">
              {[...Array(4)].map((_, setIndex) => (
                testimonials.map((testimonial, i) => (
                  <TestimonialCard 
                    key={`${setIndex}-${i}`}
                    dark={dark}
                    {...testimonial}
                  />
                ))
              ))}
            </div>
          </div>

          <div className={cn("pointer-events-none absolute inset-y-0 left-0 hidden w-1/4 sm:block", dark ? "bg-gradient-to-r from-[#10192d]" : "bg-gradient-to-r from-[#f8fafb]")} />
          <div className={cn("pointer-events-none absolute inset-y-0 right-0 hidden w-1/4 sm:block", dark ? "bg-gradient-to-l from-[#10192d]" : "bg-gradient-to-l from-[#f8fafb]")} />
        </div>
      </div>
    </Root>
  )
}
