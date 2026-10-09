import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Geometry mirrors the Figma "Alert" component set (697:1823):
// 12px padding, 12px gap, 8px radius, 24px icon, 14px text.
const alertVariants = cva(
  "group/alert relative grid w-full gap-1 rounded-md border p-3 text-left text-sm text-foreground has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 *:[svg]:row-span-2 *:[svg:not([class*='size-'])]:size-6",
  {
    variants: {
      variant: {
        warning: "border-warning/30 bg-warning/20 *:[svg]:text-warning",
        tip: "border-tip/30 bg-tip/10 *:[svg]:text-tip *:data-[slot=alert-title]:text-tip",
        success: "border-success/30 bg-success/20 *:[svg]:text-success",
        error:
          "border-destructive/30 bg-destructive/20 *:[svg]:text-destructive",
        info: "border-foreground/20 bg-foreground/10 *:[svg]:text-foreground",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-bold group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4 [&_strong]:font-bold",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  )
}

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>

export { Alert, AlertTitle, AlertDescription, AlertAction, alertVariants }
export type { AlertVariant }
