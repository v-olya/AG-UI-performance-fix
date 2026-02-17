import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "@copilotkit/react-ui/styles.css";
import { ReactNode } from "react";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "GenUI Page fixer",
  description:
    "GenUI demo showcasing 4 UI patterns for fixing common web performance issues: script sandboxing, layout stabilization, resource prioritization, and execution splitting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
