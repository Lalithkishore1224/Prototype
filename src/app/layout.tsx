import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JanNirmaan | Challenges into solutions",
  description: "A collaborative platform for citizen challenges, universities, and industry partners."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
