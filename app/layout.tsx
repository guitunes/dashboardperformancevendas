import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { WebVitals } from "@/components/web-vitals"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "THE BEAT - Dashboard de Vendas",
  description: "Análise de vendas e desempenho para a academia The Beat",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-br">
      <body className={inter.className}>
        <WebVitals />
        {children}
        <Toaster />
      </body>
    </html>
  )
}


import './globals.css'