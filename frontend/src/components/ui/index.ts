// Jednotný vstupní bod pro UI napříč aplikací: `import { ... } from "@/components/ui"`.
//
// Primitiva pocházejí ze shadcn UI kitu v `@/components/ui-kit` (tam je cílí i
// shadcn CLI podle `components.json`). Ručně je needitujeme — přidávají se přes
// `npx shadcn@latest add <component>` a pak se jen re-exportují níže.
// Zbytek jsou projektové komponenty postavené nad těmito primitivy.

// ── shadcn UI kit (primitiva) ────────────────────────────────────────────────
export { Button, buttonVariants } from "../ui-kit/button";
export { Badge, badgeVariants, type BadgeVariant } from "../ui-kit/badge";
export {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
  alertVariants,
  type AlertVariant,
} from "../ui-kit/alert";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "../ui-kit/card";
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../ui-kit/dialog";
export {
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerClose,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "../ui-kit/drawer";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "../ui-kit/select";
export { StatusSelect, STATUSES } from "../ui-kit/status-select";
export { Input } from "../ui-kit/input";
export { Textarea } from "../ui-kit/textarea";
export { Label } from "../ui-kit/label";
export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants } from "../ui-kit/tabs";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../ui-kit/tooltip";
export { Checkbox } from "../ui-kit/checkbox";
export { Switch } from "../ui-kit/switch";
export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
} from "../ui-kit/progress";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "../ui-kit/table";
export { Separator } from "../ui-kit/separator";
export { Skeleton } from "../ui-kit/skeleton";
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "../ui-kit/dropdown-menu";

// ── Projektové komponenty ────────────────────────────────────────────────────
export { Dropdown, SimpleBotIcon } from "./Dropdown";
export { CourseCard } from "./CourseCard";
export { StatusBadge, PublishBadge, ModuleActiveBadge } from "./Badge";
export { Modal } from "./Modal";
export { ConfirmModal, type ConfirmVariant } from "./ConfirmModal";
export { RichTextEditor, useRichTextEditor } from "./RichTextEditor";
export {
  AdminDashboardSkeleton,
  AuthSkeleton,
  ReviewCardsSkeleton,
  AiMentorSkeleton,
  PageSpinner,
  CourseDetailSkeleton,
  ProfileSkeleton,
  MaterialDetailSkeleton,
  MaterialGridSkeleton,
  RatingListSkeleton,
} from "./Skeletons";

// Toasty jedou na vlastním providerů z `./Toast` (mountovaný v app/layout.tsx),
// ne na kitovém Base UI toastu — ten je zatím jen v showcase na /ui-kit.
export { ToastProvider, useToast, parseApiErrorMessage } from "./Toast";
export type { Toast, ToastVariant } from "./Toast";
