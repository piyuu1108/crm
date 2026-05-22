import type { Metadata } from "next";
import { Inter, Outfit, Public_Sans, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const dmSansHeading = DM_Sans({subsets:['latin'],variable:'--font-heading'});

const publicSans = Public_Sans({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VTCBCSR",
  description: "College ERP Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", inter.variable, outfit.variable, "font-sans", publicSans.variable, dmSansHeading.variable)}
    >
      <head>
      <link rel="icon" href="/logo1.png" sizes="any" type="image/png"/>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
