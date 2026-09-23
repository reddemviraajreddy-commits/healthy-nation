import { format, formatDistanceToNow } from "date-fns";

export function formatCurrency(amountInCents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amountInCents / 100);
}

export function formatDate(dateString: string) {
  return format(new Date(dateString), "MMM d, yyyy");
}

export function formatTime(dateString: string) {
  return format(new Date(dateString), "h:mm a");
}

export function formatDateTime(dateString: string) {
  return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
}

export function formatRelative(dateString: string) {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
