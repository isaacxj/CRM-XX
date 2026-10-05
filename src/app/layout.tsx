import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { env } from "@/env";
import { FlashProblem, ToastProvider } from "@/components/kit/toast";
import { Shell } from "@/components/shell";
import { getCurrentUserEmail } from "@/server/user";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "CRM-XX",
  description: "Internal CRM for Statixx and Trazo.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userEmail = await getCurrentUserEmail();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <Shell userEmail={userEmail}>{children}</Shell>
          <Suspense>
            <FlashProblem />
          </Suspense>
        </ToastProvider>
      </body>
    </html>
  );
}
