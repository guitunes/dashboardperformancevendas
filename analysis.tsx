"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, parseNumericValue, formatDateToDDMM } from "@/lib/utils"

export default function Analysis() {
  const [isLoading, setIsLoading] = useState(true)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function analyzeData() {
      try {
        setIsLoading(true)

        // Fetch the CSV file
        const response = await fetch(
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sales-items_export_20250415074805-r7tigatuvhIK2w9pfG3KmZovhUzxZH.csv",
        )
        if (!response.ok) {
          throw new Error("Failed to fetch CSV file")
        }

        const csvText = await response.text()
        const result = processCSV(csvText)
        setAnalysis(result)
      } catch (err) {
        console.error("Error analyzing data:", err)
        setError(err instanceof Error ? err.message : "Unknown error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    analyzeData()
  }, [])

  // Process CSV data
  function processCSV(csvText: string) {
    // Parse CSV
    const rows = csvText.split(/\r?\n/).filter((row) => row.trim().length > 0)
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

    console.log("Headers:", headers)
    console.log("Sample row:", data[0])

    // Find important columns
    const totalColumn = findColumn(headers, ["TOTAL", "Total", "total", "Valor", "valor"])
    const dateColumn = findColumn(headers, ["Date", "Data", "data", "DATA", "Date Created"])
    const consultorColumn = findColumn(headers, [
      "Account manager",
      "Consultant",
      "consultor",
      "Consultor",
      "Created by",
      "Vendedor",
    ])
    const productColumn = findColumn(headers, ["Product", "Produto", "produto", "PRODUTO", "Item", "Service"])

    // Find category-related columns
    const categoryColumns = headers.filter(
      (header) =>
        header.toLowerCase().includes("category") ||
        header.toLowerCase().includes("categoria") ||
        header.toLowerCase().includes("type") ||
        header.toLowerCase().includes("tipo"),
    )

    const assinaturaColumns = headers.filter(
      (header) =>
        header.toLowerCase().includes("assinatura") ||
        header.toLowerCase().includes("subscription") ||
        header.toLowerCase().includes("membership"),
    )

    const planosColumns = headers.filter(
      (header) =>
        header.toLowerCase().includes("plano") ||
        header.toLowerCase().includes("plan") ||
        header.toLowerCase().includes("package"),
    )

    const modalidadesColumns = headers.filter(
      (header) =>
        header.toLowerCase().includes("modalidade") ||
        header.toLowerCase().includes("modality") ||
        header.toLowerCase().includes("mode"),
    )

    // Calculate KPIs
    let totalSales = 0
    let numberOfContracts = 0

    if (totalColumn) {
      totalSales = data.reduce((sum, row) => {
        const value = parseNumericValue(row[totalColumn])
        return sum + (isNaN(value) ? 0 : value)
      }, 0)
    }

    // Count contracts based on data in specified columns
    numberOfContracts = data.filter((row) => {
      // Check if any of the category columns has data
      const hasCategory = categoryColumns.some((col) => row[col] && row[col].trim() !== "")

      // Check if any of the assinatura columns has data
      const hasAssinatura = assinaturaColumns.some((col) => row[col] && row[col].trim() !== "")

      // Check if any of the planos columns has data
      const hasPlanos = planosColumns.some((col) => row[col] && row[col].trim() !== "")

      // Check if any of the modalidades columns has data
      const hasModalidades = modalidadesColumns.some((col) => row[col] && row[col].trim() !== "")

      // Count as a contract if any of these columns has data
      return hasCategory || hasAssinatura || hasPlanos || hasModalidades || true // Temporarily count all rows
    }).length

    // Calculate average ticket
    const averageTicket = numberOfContracts > 0 ? totalSales / numberOfContracts : 0

    // Calculate sales by day
    const salesByDay: Record<string, number> = {}

    if (dateColumn) {
      data.forEach((row) => {
        const dateValue = row[dateColumn]
        if (dateValue) {
          const formattedDate = formatDateToDDMM(dateValue)

          if (!salesByDay[formattedDate]) {
            salesByDay[formattedDate] = 0
          }

          const value = totalColumn ? parseNumericValue(row[totalColumn]) : 0
          salesByDay[formattedDate] += isNaN(value) ? 0 : value
        }
      })
    }

    // Sort days chronologically
    const sortedDays = Object.keys(salesByDay).sort((a, b) => {
      const partsA = a.split("/")
      const partsB = b.split("/")

      // Compare months first, then days
      const monthA = Number.parseInt(partsA[1])
      const monthB = Number.parseInt(partsB[1])

      if (monthA !== monthB) {
        return monthA - monthB
      }

      return Number.parseInt(partsA[0]) - Number.parseInt(partsB[0])
    })

    // Calculate consultant rankings
    const consultorSales: Record<string, number> = {}

    if (consultorColumn) {
      data.forEach((row) => {
        const consultor = row[consultorColumn] ? String(row[consultorColumn]).trim() : "Não especificado"

        if (!consultorSales[consultor]) {
          consultorSales[consultor] = 0
        }

        const value = totalColumn ? parseNumericValue(row[totalColumn]) : 0
        consultorSales[consultor] += isNaN(value) ? 0 : value
      })
    }

    // Sort consultants by sales
    const consultorRanking = Object.entries(consultorSales)
      .map(([Consultor, Total]) => ({ Consultor, Total }))
      .sort((a, b) => b.Total - a.Total)

    // Calculate percentages
    const totalConsultorSales = consultorRanking.reduce((sum, { Total }) => sum + Total, 0)
    const consultorRankingWithPercentage = consultorRanking.map((consultor) => ({
      ...consultor,
      Percentual: Number.parseFloat(((consultor.Total / totalConsultorSales) * 100).toFixed(1)),
    }))

    // Calculate trial classes
    const experimentais: Record<string, number> = {}
    let totalExperimentais = 0

    if (productColumn && consultorColumn) {
      data.forEach((row) => {
        const produto = row[productColumn] ? String(row[productColumn]).trim() : ""
        const consultor = row[consultorColumn] ? String(row[consultorColumn]).trim() : "Não especificado"

        const isExperimental =
          produto &&
          (produto.toLowerCase().includes("experimental") ||
            produto.toLowerCase().includes("trial") ||
            produto.toLowerCase().includes("test") ||
            produto.toLowerCase().includes("teste"))

        if (isExperimental) {
          totalExperimentais++

          if (!experimentais[consultor]) {
            experimentais[consultor] = 0
          }

          experimentais[consultor]++
        }
      })
    }

    // Sort trial classes by quantity
    const experimentaisRanking = Object.entries(experimentais)
      .map(([Consultor, Quantidade]) => ({ Consultor, Quantidade }))
      .sort((a, b) => b.Quantidade - a.Quantidade)

    // Calculate product rankings
    const produtos: Record<string, { Total: number; Quantidade: number }> = {}

    if (productColumn && totalColumn) {
      data.forEach((row) => {
        const produto = row[productColumn] ? String(row[productColumn]).trim() : "Não especificado"

        if (!produtos[produto]) {
          produtos[produto] = { Total: 0, Quantidade: 0 }
        }

        const value = parseNumericValue(row[totalColumn])
        produtos[produto].Total += isNaN(value) ? 0 : value
        produtos[produto].Quantidade++
      })
    }

    // Sort products by value
    const produtosRanking = Object.entries(produtos)
      .map(([Product, data]) => ({ Product, ...data }))
      .filter((product) => product.Total > 0)
      .sort((a, b) => b.Total - a.Total)
      .slice(0, 5)

    return {
      kpis: {
        totalSales,
        numberOfContracts,
        averageTicket,
        totalExperimentais,
        totalAssinaturas: numberOfContracts - totalExperimentais,
      },
      salesByDay: {
        labels: sortedDays,
        values: sortedDays.map((day) => salesByDay[day]),
      },
      rankings: {
        consultores: consultorRankingWithPercentage,
        experimentais: experimentaisRanking,
        produtos: produtosRanking,
      },
      columnsFound: {
        totalColumn,
        dateColumn,
        consultorColumn,
        productColumn,
        categoryColumns,
        assinaturaColumns,
        planosColumns,
        modalidadesColumns,
      },
    }
  }

  // Helper function to find column
  function findColumn(columns: string[], possibleNames: string[]): string | null {
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

    return null
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-8 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-red-300">
          <CardHeader>
            <CardTitle className="text-red-600">Erro na Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Análise Prévia dos Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-bold mb-4">Colunas Encontradas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p>
                <strong>Coluna Total:</strong> {analysis.columnsFound.totalColumn || "Não encontrada"}
              </p>
              <p>
                <strong>Coluna Data:</strong> {analysis.columnsFound.dateColumn || "Não encontrada"}
              </p>
              <p>
                <strong>Coluna Consultor:</strong> {analysis.columnsFound.consultorColumn || "Não encontrada"}
              </p>
              <p>
                <strong>Coluna Produto:</strong> {analysis.columnsFound.productColumn || "Não encontrada"}
              </p>
            </div>
            <div>
              <p>
                <strong>Colunas Categoria:</strong> {analysis.columnsFound.categoryColumns.join(", ") || "Nenhuma"}
              </p>
              <p>
                <strong>Colunas Assinatura:</strong> {analysis.columnsFound.assinaturaColumns.join(", ") || "Nenhuma"}
              </p>
              <p>
                <strong>Colunas Planos:</strong> {analysis.columnsFound.planosColumns.join(", ") || "Nenhuma"}
              </p>
              <p>
                <strong>Colunas Modalidades:</strong> {analysis.columnsFound.modalidadesColumns.join(", ") || "Nenhuma"}
              </p>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4">Indicadores Principais (KPIs)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-semibold text-gray-500 mb-2">Total de Vendas</div>
              <div className="text-2xl font-bold text-cyan-600">{formatCurrency(analysis.kpis.totalSales)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-semibold text-gray-500 mb-2">Número de Contratos</div>
              <div className="text-2xl font-bold text-green-600">{analysis.kpis.numberOfContracts}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-semibold text-gray-500 mb-2">Ticket Médio</div>
              <div className="text-2xl font-bold text-orange-500">{formatCurrency(analysis.kpis.averageTicket)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-semibold text-gray-500 mb-2">Total de Experimentais</div>
              <div className="text-2xl font-bold text-emerald-500">{analysis.kpis.totalExperimentais}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-semibold text-gray-500 mb-2">Total de Assinaturas</div>
              <div className="text-2xl font-bold text-green-600">{analysis.kpis.totalAssinaturas}</div>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4">Dados do Gráfico (Vendas por Dia)</h2>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Data</th>
                  <th className="border p-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {analysis.salesByDay.labels.map((label: string, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="border p-2">{label}</td>
                    <td className="border p-2 text-right">{formatCurrency(analysis.salesByDay.values[index])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-bold mb-4">Ranking de Consultores</h2>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Consultor</th>
                  <th className="border p-2 text-right">Total</th>
                  <th className="border p-2 text-right">Percentual</th>
                </tr>
              </thead>
              <tbody>
                {analysis.rankings.consultores.map((consultor: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="border p-2">{consultor.Consultor}</td>
                    <td className="border p-2 text-right">{formatCurrency(consultor.Total)}</td>
                    <td className="border p-2 text-right">{consultor.Percentual}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-bold mb-4">Ranking de Experimentais</h2>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Consultor</th>
                  <th className="border p-2 text-right">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {analysis.rankings.experimentais.map((consultor: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="border p-2">{consultor.Consultor}</td>
                    <td className="border p-2 text-right">{consultor.Quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-bold mb-4">Top 5 Produtos</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Produto</th>
                  <th className="border p-2 text-right">Total</th>
                  <th className="border p-2 text-right">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {analysis.rankings.produtos.map((produto: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="border p-2">{produto.Product}</td>
                    <td className="border p-2 text-right">{formatCurrency(produto.Total)}</td>
                    <td className="border p-2 text-right">{produto.Quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
