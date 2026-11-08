import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import AuthProvider from "@/context/auth/AuthProvider";
import ToastProvider from "@/context/toast/ToastProvider";
import StudentsProvider from "@/context/students/StudentsProvider";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "منصة المعلم التعليمية",
  description: "نظام إدارة الدروس والطلاب المتقدم",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-slate-950 text-slate-100">
        <AuthProvider>
          <ToastProvider>
            <StudentsProvider>{children}</StudentsProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
