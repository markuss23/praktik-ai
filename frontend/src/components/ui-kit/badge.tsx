import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Geometry mirrors the Figma "Pills info" component set (2092:4916):
// 12px/2px padding, 8px radius, 10px bold text, tint at 15% with solid text.
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-3 py-0.5 text-[10px] font-bold whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        new: "bg-brand-accent/15 text-brand-accent [a]:hover:bg-brand-accent/25",
        open: "bg-gradient-r/15 text-gradient-r [a]:hover:bg-gradient-r/25",
        waiting: "bg-gradient-l/15 text-gradient-l [a]:hover:bg-gradient-l/25",
        resolved: "bg-success/15 text-success [a]:hover:bg-success/25",
        closed:
          "bg-foreground/15 text-foreground/50 [a]:hover:bg-foreground/25",
      },
    },
    defaultVariants: {
      variant: "new",
    },
  }
)

function Badge({
  className,
  variant = "new",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

export { Badge, badgeVariants }
export type { BadgeVariant }
