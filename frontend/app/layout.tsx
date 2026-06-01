import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/smooth-scroll";

// Configure Inter exactly like the reference design
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Payroll Operations | Nippon Toyota",
  description: "Enterprise Salary Slip Automation System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      {/* Apply the variable and force the font family */}
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground min-h-screen selection:bg-primary selection:text-primary-foreground`}>
        <SmoothScroll>
        {children}
        </SmoothScroll>
      </body>
    </html>
  );
}