import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export interface TestimonialAuthor {
  name: string
  handle: string
  avatar: string
}

export interface TestimonialCardProps {
  author: TestimonialAuthor
  text: string
  href?: string
  className?: string
  dark?: boolean
}

export function TestimonialCard({ 
  author,
  text,
  href,
  className,
  dark = false
}: TestimonialCardProps) {
  const Card = href ? 'a' : 'div'
  const initials = author.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
  
  return (
    <Card
      {...(href ? { href } : {})}
      className={cn(
        "flex h-full flex-col rounded-[24px] p-5 text-start sm:p-6",
        dark
          ? "border border-slate-700/70 bg-slate-950/70 shadow-[0_18px_40px_rgba(2,8,23,0.28)]"
          : "border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]",
        "w-[82vw] max-w-[340px] min-w-[250px] sm:min-w-[300px] transition-colors duration-300",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar
          className={cn(
            "h-14 w-14 rounded-2xl shadow-sm",
            dark ? "border border-slate-700 bg-slate-900" : "border border-slate-200 bg-white",
          )}
        >
          <AvatarImage src={author.avatar} alt={author.name} className="object-contain p-1.5" />
          <AvatarFallback
            className={cn(
              "rounded-2xl text-sm font-semibold",
              dark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700",
            )}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col items-start">
          <h3 className={cn("text-base font-semibold leading-none", dark ? "text-white" : "text-slate-900")}>
            {author.name}
          </h3>
          <p className={cn("text-sm break-words leading-5", dark ? "text-slate-400" : "text-slate-500")}>
            {author.handle}
          </p>
        </div>
      </div>
      <p className={cn("mt-4 text-sm leading-7 sm:text-[15px]", dark ? "text-slate-300" : "text-slate-600")}>
        {text}
      </p>
    </Card>
  )
}
