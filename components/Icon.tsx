import * as Lucide from "lucide-react";
import type { LucideProps } from "lucide-react";

/** Render a lucide icon by name (string), with a safe fallback. */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = (Lucide as any)[name] ?? Lucide.Circle;
  return <Cmp {...props} />;
}
