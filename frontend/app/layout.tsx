import type { Metadata, Viewport } from "next"
import { Noto_Sans_Arabic } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/src/context/auth-context"
import "./globals.css"

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "JobNova - منصة التوظيف الأولى في مصر",
  description: "اكتشف أفضل فرص العمل في مصر. تقدم على آلاف الوظائف في كبرى الشركات المصرية.",
}

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className={`${notoArabic.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
