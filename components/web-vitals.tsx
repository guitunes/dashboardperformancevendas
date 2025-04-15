"use client"

import { useReportWebVitals } from "next/web-vitals"

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.log(metric)

    // You can send these metrics to your analytics service
    const body = JSON.stringify(metric)

    // Use `navigator.sendBeacon()` if available
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", body)
    } else {
      fetch("/api/analytics", { body, method: "POST", keepalive: true })
    }
  })

  return null
}
