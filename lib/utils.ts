import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

/**
 * Enhanced column finder that uses multiple strategies to locate columns
 * 1. Exact match
 * 2. Case-insensitive match
 * 3. Partial match (contains)
 * 4. Fuzzy match (similarity score)
 */
export function findColumn(columns: string[], possibleNames: string[]): string | null {
  // Try exact match
  for (const name of possibleNames) {
    const column = columns.find((col) => col === name)
    if (column) return column
  }

  // Try case-insensitive match
  for (const name of possibleNames) {
    const column = columns.find((col) => col.toLowerCase() === name.toLowerCase())
    if (column) return column
  }

  // Try contains match
  for (const name of possibleNames) {
    const column = columns.find((col) => col.toLowerCase().includes(name.toLowerCase()))
    if (column) return column
  }

  // Try word boundary match (e.g., "Created By" would match "Created by User")
  for (const name of possibleNames) {
    const words = name.toLowerCase().split(/\s+/)
    const column = columns.find((col) => {
      const colLower = col.toLowerCase()
      return words.every(
        (word) =>
          colLower.includes(word) ||
          // Check for common abbreviations
          (word.length > 3 && colLower.includes(word.substring(0, 4))),
      )
    })
    if (column) return column
  }

  return null
}

/**
 * Validates if a value can be converted to a number
 */
export function isValidNumber(value: any): boolean {
  if (value === null || value === undefined || value === "") return false

  // Handle string representations of numbers
  if (typeof value === "string") {
    // Remove currency symbols and separators
    const cleanValue = value.replace(/[^\d.-]/g, "")
    return !isNaN(Number.parseFloat(cleanValue)) && isFinite(Number(cleanValue))
  }

  return !isNaN(value) && isFinite(Number(value))
}

/**
 * Converts various value formats to a number
 */
export function parseNumericValue(value: any): number {
  if (value === null || value === undefined || value === "") return 0

  if (typeof value === "number") return value

  if (typeof value === "string") {
    // Remove currency symbols, thousand separators, and other non-numeric characters
    const cleanValue = value.replace(/[^\d.,-]/g, "")

    // Handle different decimal separators
    // If there are multiple dots, assume the last one is the decimal separator
    // If there's a comma after the last dot, assume comma is the decimal separator
    let normalizedValue = cleanValue

    if (cleanValue.includes(".") && cleanValue.includes(",")) {
      const lastDotIndex = cleanValue.lastIndexOf(".")
      const lastCommaIndex = cleanValue.lastIndexOf(",")

      if (lastCommaIndex > lastDotIndex) {
        // Format: 1.234,56 (European)
        normalizedValue = cleanValue.replace(/\./g, "").replace(",", ".")
      } else {
        // Format: 1,234.56 (US/UK)
        normalizedValue = cleanValue.replace(/,/g, "")
      }
    } else if (cleanValue.includes(",")) {
      // Only commas, assume it's a decimal separator
      normalizedValue = cleanValue.replace(",", ".")
    }

    const parsedValue = Number.parseFloat(normalizedValue)
    return isNaN(parsedValue) ? 0 : parsedValue
  }

  return 0
}

/**
 * Formats a date from various formats to DD/MM
 */
export function formatDateToDDMM(date: Date | string | number): string {
  let dateObj: Date

  if (typeof date === "string") {
    // Try different date formats
    if (date.includes("/")) {
      const parts = date.split("/")
      dateObj = new Date(Number.parseInt(parts[2]), Number.parseInt(parts[1]) - 1, Number.parseInt(parts[0]))
    } else if (date.includes("-")) {
      dateObj = new Date(date)
    } else {
      dateObj = new Date()
    }
  } else if (typeof date === "number") {
    // Excel stores dates as number of days since 1/1/1900
    dateObj = new Date((date - 25569) * 86400 * 1000)
  } else if (date instanceof Date) {
    dateObj = date
  } else {
    dateObj = new Date()
  }

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    dateObj = new Date()
  }

  return `${dateObj.getDate().toString().padStart(2, "0")}/${(dateObj.getMonth() + 1).toString().padStart(2, "0")}`
}

/**
 * Parses CSV data into a workbook format compatible with the Excel processor
 */
export function parseCSVToWorkbook(csvData: string): any {
  try {
    // Parse CSV data
    const rows = csvData.split(/\r?\n/).filter((row) => row.trim().length > 0)

    if (rows.length === 0) {
      throw new Error("CSV file is empty")
    }

    // Extract headers
    const headers = rows[0].split(",").map((header) => header.trim())

    // Create data rows
    const data = rows.slice(1).map((row) => {
      const values = row.split(",").map((value) => value.trim())
      const rowData: Record<string, any> = {}

      headers.forEach((header, index) => {
        rowData[header] = values[index] || ""
      })

      return rowData
    })

    // Create a workbook-like structure
    return {
      SheetNames: ["Sheet1"],
      Sheets: {
        Sheet1: {
          data: data,
          headers: headers,
        },
      },
    }
  } catch (error) {
    console.error("Error parsing CSV:", error)
    throw new Error("Failed to parse CSV file. Please check the file format.")
  }
}

/**
 * Enhanced column finder that specifically looks for KPI-related columns
 */
export function findKPIColumns(headers: string[]): {
  totalColumn: string | null
  categoryColumns: string[]
  assinaturaColumns: string[]
  planosColumns: string[]
  modalidadesColumns: string[]
} {
  const totalColumn = findColumn(headers, [
    "TOTAL",
    "Total",
    "total",
    "Valor",
    "valor",
    "VALOR",
    "Price",
    "Amount",
    "Value",
    "Total Value",
    "Valor Total",
  ])

  // Find category columns
  const categoryColumns = headers.filter(
    (header) =>
      header.toLowerCase().includes("category") ||
      header.toLowerCase().includes("categoria") ||
      header.toLowerCase().includes("type") ||
      header.toLowerCase().includes("tipo"),
  )

  // Find assinatura columns
  const assinaturaColumns = headers.filter(
    (header) =>
      header.toLowerCase().includes("assinatura") ||
      header.toLowerCase().includes("subscription") ||
      header.toLowerCase().includes("membership"),
  )

  // Find planos columns
  const planosColumns = headers.filter(
    (header) =>
      header.toLowerCase().includes("plano") ||
      header.toLowerCase().includes("plan") ||
      header.toLowerCase().includes("package"),
  )

  // Find modalidades columns
  const modalidadesColumns = headers.filter(
    (header) =>
      header.toLowerCase().includes("modalidade") ||
      header.toLowerCase().includes("modality") ||
      header.toLowerCase().includes("mode") ||
      header.toLowerCase().includes("type"),
  )

  return {
    totalColumn,
    categoryColumns,
    assinaturaColumns,
    planosColumns,
    modalidadesColumns,
  }
}

/**
 * Calculates KPIs from the extracted data
 */
export function calculateKPIs(
  data: any[],
  columns: {
    totalColumn: string | null
    categoryColumns: string[]
    assinaturaColumns: string[]
    planosColumns: string[]
    modalidadesColumns: string[]
  },
): {
  totalSales: number
  numberOfContracts: number
  averageTicket: number
} {
  let totalSales = 0
  let numberOfContracts = 0

  // Calculate total sales
  if (columns.totalColumn) {
    totalSales = data.reduce((sum, row) => {
      const value = parseNumericValue(row[columns.totalColumn as string])
      return sum + (isNaN(value) ? 0 : value)
    }, 0)
  }

  // Count contracts based on data in specified columns
  numberOfContracts = data.filter((row) => {
    // Check if any of the category columns has data
    const hasCategory = columns.categoryColumns.some((col) => row[col] && row[col].trim() !== "")

    // Check if any of the assinatura columns has data
    const hasAssinatura = columns.assinaturaColumns.some((col) => row[col] && row[col].trim() !== "")

    // Check if any of the planos columns has data
    const hasPlanos = columns.planosColumns.some((col) => row[col] && row[col].trim() !== "")

    // Check if any of the modalidades columns has data
    const hasModalidades = columns.modalidadesColumns.some((col) => row[col] && row[col].trim() !== "")

    // Count as a contract if any of these columns has data
    return hasCategory || hasAssinatura || hasPlanos || hasModalidades
  }).length

  // Calculate average ticket
  const averageTicket = numberOfContracts > 0 ? totalSales / numberOfContracts : 0

  return {
    totalSales,
    numberOfContracts,
    averageTicket,
  }
}

/**
 * Checks if a value exists and is not empty
 */
export function hasValue(value: any): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim() !== ""
  return true
}
