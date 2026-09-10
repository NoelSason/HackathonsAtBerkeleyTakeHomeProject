import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <Link href="/" className="absolute top-8 left-6 sm:left-12">
        <Wordmark qualifier="PORTAL" />
      </Link>

      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="w-full max-w-100">{children}</div>
      </main>
    </div>
  );
}
