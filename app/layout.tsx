import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const mcTitle = localFont({
  src: "./fonts/Minecrafter-Alt.ttf",
  variable: "--font-mc-title",
});

const mcHeading = localFont({
  src: "./fonts/MinecraftTen.ttf",
  variable: "--font-mc-heading",
});

const mcSubheading = localFont({
  src: "./fonts/MinecraftRegular.otf",
  variable: "--font-mc-subheading",
});

export const metadata: Metadata = {
  title: "Hmmify",
  description: "Convert YouTube videos into hilarious Minecraft villager singing videos!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mcTitle.variable} ${mcHeading.variable} ${mcSubheading.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
