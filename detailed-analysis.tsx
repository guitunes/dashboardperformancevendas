"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

export default function DetailedAnalysis() {
  const [isLoading, setIsLoading] = useState(true)
  const [csvData, setCsvData] = useState<string>("")
  const [parsedData, setParsedData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAndAnalyzeData() {
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
        setCsvData(csvText)

        // Parse CSV
        const rows = csvText.split(/\r?\n/).filter((row) => row.trim().length > 0)
        const headerRow = rows[0].split(",").map((header) => header.trim())
        setHeaders(headerRow)

        // Create data rows
        const dataRows = rows.slice(1).map((row) => {
          const values = row.split(",").map((value) => value.trim())
          const rowData: Record<string, any> = {}

          headerRow.forEach((header, index) => {
            rowData[header] = values[index] || ""
          })

          return rowData
        })
        setParsedData(dataRows)

        // Analyze the data
        const analysisResult = analyzeData(headerRow, dataRows)
        setAnalysis(analysisResult)
      } catch (err) {
        console.error("Error analyzing data:", err)
        setError(err instanceof Error ? err.message : "Unknown error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAndAnalyzeData()
  }, [])

  function analyzeData(headers: string[], data: any[]) {
    console.log("Headers:", headers)
    console.log("First row:", data[0])
    console.log("Total rows:", data.length)

    // 1. Calculate Total Sales
    let totalSales = 0
    data.forEach((row) => {
      const totalValue = Number.parseFloat(row["TOTAL"] || "0")
      if (!isNaN(totalValue)) {
        totalSales += totalValue
      }
    })

    // 2. Count number of contracts
    const numberOfContracts = data.length

    // 3. Calculate average ticket
    const averageTicket = totalSales / numberOfContracts

    // 4. Count experimental classes
    let totalExperimentais = 0
    data.forEach((row) => {
      const product = (row["Product"] || "").toLowerCase()
      if (
        product.includes("experimental") ||
        product.includes("trial") ||
        product.includes("test") ||
        product.includes("teste") ||
        product === "aula experimental"
      ) {
        totalExperimentais++
      }
    })

    // 5. Calculate sales by day
    const salesByDay: Record<string, number> = {}
    data.forEach((row) => {
      const date = row["Date"] || ""
      if (date) {
        // Format date to DD/MM
        const dateParts = date.split("/")
        if (dateParts.length === 3) {
          const formattedDate = `${dateParts[0]}/${dateParts[1]}`

          if (!salesByDay[formattedDate]) {
            salesByDay[formattedDate] = 0
          }

          const totalValue = Number.parseFloat(row["TOTAL"] || "0")
          if (!isNaN(totalValue)) {
            salesByDay[formattedDate] += totalValue
          }
        }
      }
    })

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

    // 6. Calculate consultant rankings
    const consultorSales: Record<string, number> = {}
    data.forEach((row) => {
      const consultor = row["Account manager"] || "Não especificado"

      if (!consultorSales[consultor]) {
        consultorSales[consultor] = 0
      }

      const totalValue = Number.parseFloat(row["TOTAL"] || "0")
      if (!isNaN(totalValue)) {
        consultorSales[consultor] += totalValue
      }
    })

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

    // 7. Calculate experimental classes by consultant
    const experimentaisPorConsultor: Record<string, number> = {}
    data.forEach((row) => {
      const product = (row["Product"] || "").toLowerCase()
      const consultor = row["Account manager"] || "Não especificado"

      if (
        product.includes("experimental") ||
        product.includes("trial") ||
        product.includes("test") ||
        product.includes("teste") ||
        product === "aula experimental"
      ) {
        if (!experimentaisPorConsultor[consultor]) {
          experimentaisPorConsultor[consultor] = 0
        }

        experimentaisPorConsultor[consultor]++
      }
    })

    // Sort experimental classes by quantity
    const experimentaisRanking = Object.entries(experimentaisPorConsultor)
      .map(([Consultor, Quantidade]) => ({ Consultor, Quantidade }))
      .sort((a, b) => b.Quantidade - a.Quantidade)

    // 8. Calculate product rankings
    const produtoVendas: Record<string, { Total: number; Quantidade: number }> = {}
    data.forEach((row) => {
      const produto = row["Product"] || "Não especificado"

      if (!produtoVendas[produto]) {
        produtoVendas[produto] = { Total: 0, Quantidade: 0 }
      }

      const totalValue = Number.parseFloat(row["TOTAL"] || "0")
      if (!isNaN(totalValue)) {
        produtoVendas[produto].Total += totalValue
        produtoVendas[produto].Quantidade++
      }
    })

    // Sort products by value
    const produtosRanking = Object.entries(produtoVendas)
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
    }
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
          <CardTitle>Análise Detalhada dos Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Informações do Arquivo</h2>
            <p>
              <strong>Total de Linhas:</strong> {parsedData.length}
            </p>
            <p>
              <strong>Colunas:</strong> {headers.join(", ")}
            </p>
          </div>

          <h2 className="text-xl font-bold mb-4">Indicadores Principais (KPIs)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-semibold text-gray-500 mb-2">Total de Vendas</div>
              <div className="text-2xl font-bold text-cyan-600">{formatCurrency(analysis.kpis.totalSales)}</div>
              <div className="text-xs text-gray-500 mt-1">Soma de todos os valores na coluna 'TOTAL'</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-semibold text-gray-500 mb-2">Número de Contratos</div>
              <div className="text-2xl font-bold text-green-600">{analysis.kpis.numberOfContracts}</div>
              <div className="text-xs text-gray-500 mt-1">Total de linhas no arquivo CSV</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-semibold text-gray-500 mb-2">Ticket Médio</div>
              <div className="text-2xl font-bold text-orange-500">{formatCurrency(analysis.kpis.averageTicket)}</div>
              <div className="text-xs text-gray-500 mt-1">Total de Vendas ÷ Número de Contratos</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-semibold text-gray-500 mb-2">Total de Experimentais</div>
              <div className="text-2xl font-bold text-emerald-500">{analysis.kpis.totalExperimentais}</div>
              <div className="text-xs text-gray-500 mt-1">Contagem de produtos com "experimental" no nome</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-semibold text-gray-500 mb-2">Total de Assinaturas</div>
              <div className="text-2xl font-bold text-green-600">{analysis.kpis.totalAssinaturas}</div>
              <div className="text-xs text-gray-500 mt-1">Número de Contratos - Total de Experimentais</div>
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
