"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  DollarSign,
  Users,
  CreditCard,
  Tag,
  TrendingUp,
  Trophy,
  Clock,
  Settings,
  AlertTriangle,
  FileText,
  BarChart2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import {
  formatCurrency,
  findColumn,
  parseCSVToWorkbook,
  findKPIColumns,
  calculateKPIs,
  parseNumericValue,
  formatDateToDDMM,
  isValidNumber,
} from "@/lib/utils"

// Initial dashboard data
const initialData = {
  total_vendas: 244088.64,
  total_contratos: 285,
  total_experimentais: 86,
  total_assinaturas: 285,
  valor_assinaturas: 105846.26,
  ticket_medio_planos: 1199.8,
  vendas_por_dia: {
    labels: [
      "01/04",
      "02/04",
      "03/04",
      "04/04",
      "05/04",
      "06/04",
      "07/04",
      "08/04",
      "09/04",
      "10/04",
      "11/04",
      "12/04",
      "13/04",
      "14/04",
    ],
    values: [8200, 7700, 9100, 6500, 4300, 7800, 8700, 9800, 8600, 10000, 8700, 7800, 5400, 9500],
  },
  ranking_consultores: [
    { Consultor: "Gabi", Total: 79222.3, Percentual: 32.5 },
    { Consultor: "Gustavo", Total: 61481.83, Percentual: 25.2 },
    { Consultor: "Duda", Total: 59525.84, Percentual: 24.4 },
    { Consultor: "Gabriel", Total: 37294.56, Percentual: 15.3 },
    { Consultor: "Thiago (Inside Sales)", Total: 4239.11, Percentual: 1.7 },
  ],
  ranking_experimentais: [
    { Consultor: "Gabriel", Quantidade: 24 },
    { Consultor: "Gustavo", Quantidade: 21 },
    { Consultor: "Gabi", Quantidade: 19 },
    { Consultor: "Duda", Quantidade: 14 },
    { Consultor: "Thiago (Inside Sales)", Quantidade: 8 },
  ],
  produtos_vendidos: [
    { Product: "Black Assinatura", Total: 31543.12 },
    { Product: "Black Anual", Total: 24324.0 },
    { Product: "Musculação Anual", Total: 18600.0 },
    { Product: "Beat 10 Anual", Total: 13764.0 },
    { Product: "Plano Black", Total: 12303.14 },
  ],
}

// Chart colors
const COLORS = ["#0891b2", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#f43f5e"]

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(initialData)
  const [metaTotal, setMetaTotal] = useState(300000)
  const [metaInput, setMetaInput] = useState("300000")
  const [chartType, setChartType] = useState<"line" | "bar">("line")
  const [lastUpdate, setLastUpdate] = useState("14/04/2025 16:51")
  const [isLoading, setIsLoading] = useState(false)
  const [fileProcessingInfo, setFileProcessingInfo] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Calculate meta percentage
  const metaPercentage = Math.min(100, Math.round((dashboardData.total_vendas / metaTotal) * 100))
  const metaRestante = Math.max(0, metaTotal - dashboardData.total_vendas)

  // Format data for charts
  const salesData = dashboardData.vendas_por_dia.labels.map((date, index) => ({
    date,
    value: dashboardData.vendas_por_dia.values[index],
  }))

  // Setup drag and drop handlers
  useEffect(() => {
    const uploadArea = uploadAreaRef.current
    if (!uploadArea) return

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      uploadArea.classList.add("border-primary")
    }

    const handleDragLeave = () => {
      uploadArea.classList.remove("border-primary")
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      uploadArea.classList.remove("border-primary")

      if (e.dataTransfer?.files.length) {
        handleFileUpload(e.dataTransfer.files[0])
      }
    }

    uploadArea.addEventListener("dragover", handleDragOver)
    uploadArea.addEventListener("dragleave", handleDragLeave)
    uploadArea.addEventListener("drop", handleDrop)

    return () => {
      uploadArea.removeEventListener("dragover", handleDragOver)
      uploadArea.removeEventListener("dragleave", handleDragLeave)
      uploadArea.removeEventListener("drop", handleDrop)
    }
  }, [])

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    // Reset file processing info
    setFileProcessingInfo(null)

    // Check file extension
    const fileExtension = file.name.split(".").pop()?.toLowerCase()

    if (!fileExtension || !["xlsx", "xls", "csv"].includes(fileExtension)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV (.csv) válido",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      let workbook: any

      // Process based on file type
      if (fileExtension === "csv") {
        // Handle CSV file
        const text = await file.text()
        workbook = parseCSVToWorkbook(text)
      } else {
        // Handle Excel file
        const data = await file.arrayBuffer()
        workbook = XLSX.read(data, { type: "array" })
      }

      // Process data
      const processedData = processFileData(workbook, fileExtension)
      setDashboardData(processedData.dashboardData)

      // Set file processing info
      if (processedData.processingInfo) {
        setFileProcessingInfo(processedData.processingInfo)
      }

      // Update last update time
      const now = new Date()
      const formattedDate =
        now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      setLastUpdate(formattedDate)

      toast({
        title: "Arquivo importado com sucesso",
        description: `O dashboard foi atualizado com os novos dados. ${processedData.dashboardData.total_contratos} contratos processados.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Erro ao processar o arquivo:", error)
      toast({
        title: "Erro ao processar o arquivo",
        description:
          error instanceof Error
            ? error.message
            : "Verifique se o formato está correto e se contém as colunas necessárias.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Process file data (Excel or CSV)
  const processFileData = (workbook: any, fileType: string) => {
    try {
      let jsonData: any[] = []
      let headerRow: string[] = []
      let processingInfo = ""

      // Extract data based on file type
      if (fileType === "csv") {
        // For CSV files processed with our custom parser
        headerRow = workbook.Sheets.Sheet1.headers
        jsonData = workbook.Sheets.Sheet1.data
      } else {
        // For Excel files processed with XLSX library
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Convert to JSON with headers
        jsonData = XLSX.utils.sheet_to_json(worksheet)

        if (jsonData.length === 0) {
          throw new Error("O arquivo não contém dados.")
        }

        // Extract headers
        headerRow = Object.keys(jsonData[0])
      }

      console.log("Headers detected:", headerRow)

      // Find KPI-related columns
      const kpiColumns = findKPIColumns(headerRow)

      // Log found columns for debugging
      console.log("KPI Columns found:", kpiColumns)

      if (!kpiColumns.totalColumn) {
        processingInfo += "Aviso: Coluna 'TOTAL' não encontrada. O cálculo de vendas totais pode ser impreciso.\n"
      }

      if (
        kpiColumns.categoryColumns.length === 0 &&
        kpiColumns.assinaturaColumns.length === 0 &&
        kpiColumns.planosColumns.length === 0 &&
        kpiColumns.modalidadesColumns.length === 0
      ) {
        processingInfo +=
          "Aviso: Colunas de categorização (Categoria, Assinatura, Planos, Modalidades) não encontradas. A contagem de contratos pode ser imprecisa.\n"
      }

      // Calculate KPIs
      const kpis = calculateKPIs(jsonData, kpiColumns)

      // Find other necessary columns for dashboard data
      const colunaData = findColumn(headerRow, [
        "Date",
        "Data",
        "data",
        "DATA",
        "Date Created",
        "Creation Date",
        "Created At",
        "Data de Criação",
        "dt_criacao",
        "Dt Criacao",
      ])

      const colunaConsultor = findColumn(headerRow, [
        "Account manager",
        "Consultant",
        "consultor",
        "Consultor",
        "Created by",
        "Vendedor",
        "Salesperson",
        "Sales Rep",
        "Sales Person",
        "Responsável",
        "Responsavel",
        "Atendente",
        "Atendido por",
        "Attended by",
        "Seller",
        "Rep",
      ])

      const colunaProduto = findColumn(headerRow, [
        "Product",
        "Produto",
        "produto",
        "PRODUTO",
        "Item",
        "Service",
        "Serviço",
        "Servico",
        "Plan",
        "Plano",
      ])

      // Process data for dashboard
      const vendas: Record<string, number> = {}
      const consultores: Record<string, number> = {}
      const experimentais: Record<string, number> = {}
      const produtos: Record<string, { Total: number; Quantidade: number }> = {}
      let totalExperimentais = 0
      let rowsWithErrors = 0

      // Process each row
      jsonData.forEach((row: any, index: number) => {
        try {
          // Get values based on found columns
          const dataValue = colunaData ? row[colunaData] : null
          const consultorValue = colunaConsultor ? row[colunaConsultor] : null
          const produtoValue = colunaProduto ? row[colunaProduto] : null
          const valorValue = kpiColumns.totalColumn ? row[kpiColumns.totalColumn] : null

          // Skip rows with missing critical data
          if (!dataValue && !consultorValue && !produtoValue) {
            console.warn(`Row ${index + 2} skipped due to missing critical data`)
            rowsWithErrors++
            return
          }

          // Process consultant name
          const consultor = consultorValue ? String(consultorValue).trim() : "Não especificado"

          // Process product name
          const produto = produtoValue ? String(produtoValue).trim() : "Não especificado"

          // Process value
          let valor = 0
          if (valorValue && isValidNumber(valorValue)) {
            valor = parseNumericValue(valorValue)
          }

          // Format date
          const dataFormatada = dataValue ? formatDateToDDMM(dataValue) : "01/01"

          // Accumulate sales by day
          if (!vendas[dataFormatada]) {
            vendas[dataFormatada] = 0
          }
          vendas[dataFormatada] += valor

          // Accumulate sales by consultant
          if (!consultores[consultor]) {
            consultores[consultor] = 0
          }
          consultores[consultor] += valor

          // Count trial classes
          const isExperimental =
            produto &&
            (String(produto).toLowerCase().includes("experimental") ||
              String(produto).toLowerCase().includes("trial") ||
              String(produto).toLowerCase().includes("test") ||
              String(produto).toLowerCase().includes("teste"))

          if (isExperimental) {
            totalExperimentais++

            if (!experimentais[consultor]) {
              experimentais[consultor] = 0
            }
            experimentais[consultor]++
          }

          // Accumulate products
          if (!produtos[produto]) {
            produtos[produto] = { Total: 0, Quantidade: 0 }
          }
          produtos[produto].Total += valor
          produtos[produto].Quantidade++
        } catch (error) {
          console.error(`Error processing row ${index + 2}:`, error)
          rowsWithErrors++
        }
      })

      // Add processing info about errors
      if (rowsWithErrors > 0) {
        processingInfo += `${rowsWithErrors} linhas tiveram erros e foram parcialmente ou totalmente ignoradas.\n`
      }

      // Sort sales by day
      const diasOrdenados = Object.keys(vendas).sort((a, b) => {
        const partsA = a.split("/")
        const partsB = b.split("/")
        return (
          new Date(2025, Number.parseInt(partsA[1]) - 1, Number.parseInt(partsA[0])).getTime() -
          new Date(2025, Number.parseInt(partsB[1]) - 1, Number.parseInt(partsB[0])).getTime()
        )
      })

      // Create arrays for chart
      const labelsVendas = diasOrdenados
      const valuesVendas = diasOrdenados.map((dia) => vendas[dia])

      // Sort consultants by sales value
      const consultoresOrdenados = Object.entries(consultores)
        .map(([Consultor, Total]) => ({ Consultor, Total }))
        .sort((a, b) => b.Total - a.Total)

      // Calculate percentages
      const totalConsultores = consultoresOrdenados.reduce((sum, { Total }) => sum + Total, 0)
      const rankingConsultores = consultoresOrdenados.map((consultor) => {
        return {
          ...consultor,
          Percentual: Number.parseFloat(((consultor.Total / totalConsultores) * 100).toFixed(1)),
        }
      })

      // Sort trial classes by quantity
      const experimentaisOrdenados = Object.entries(experimentais)
        .map(([Consultor, Quantidade]) => ({ Consultor, Quantidade }))
        .sort((a, b) => b.Quantidade - a.Quantidade)

      // Sort products by value
      const produtosOrdenados = Object.entries(produtos)
        .map(([Product, data]) => ({ Product, ...data }))
        .filter((product) => product.Total > 0)
        .sort((a, b) => b.Total - a.Total)
        .slice(0, 5)

      // Create dashboard data using calculated KPIs
      const dashboardData = {
        total_vendas: kpis.totalSales,
        total_contratos: kpis.numberOfContracts,
        total_experimentais: totalExperimentais,
        total_assinaturas: kpis.numberOfContracts - totalExperimentais,
        valor_assinaturas: kpis.totalSales,
        ticket_medio_planos: kpis.averageTicket,
        vendas_por_dia: {
          labels: labelsVendas,
          values: valuesVendas,
        },
        ranking_consultores: rankingConsultores,
        ranking_experimentais: experimentaisOrdenados,
        produtos_vendidos: produtosOrdenados,
      }

      return {
        dashboardData,
        processingInfo: processingInfo.trim(),
      }
    } catch (error) {
      console.error("Error in processFileData:", error)
      throw error
    }
  }

  // Handle meta update
  const handleMetaUpdate = () => {
    const newMeta = Number.parseFloat(metaInput)
    if (isNaN(newMeta) || newMeta <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para a meta.",
        variant: "destructive",
      })
      return
    }

    setMetaTotal(newMeta)
    toast({
      title: "Meta atualizada",
      description: `A meta foi atualizada para ${formatCurrency(newMeta)}.`,
      variant: "default",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Header */}
      <header className="bg-cyan-600 text-white py-6 mb-6">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold">The Beat - Dashboard de Vendas</h1>
            <p className="mt-1">Análise de Vendas - Abril 2025</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pb-8">
        {/* Last update */}
        <div className="flex justify-end items-center mb-4 text-sm text-gray-500">
          <Clock className="h-4 w-4 mr-1" />
          <span>Última atualização: {lastUpdate}</span>
        </div>

        {/* File processing info */}
        {fileProcessingInfo && (
          <Alert className="mb-4 bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-800">
              <strong>Informações de processamento:</strong>
              <br />
              {fileProcessingInfo.split("\n").map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Main indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          <Card className="border-l-4 border-l-cyan-600">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center">
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                Vendas Total
              </div>
              <div className="text-2xl font-bold text-cyan-600">{formatCurrency(dashboardData.total_vendas)}</div>
              <div className="text-xs text-gray-500">{dashboardData.total_contratos} contratos</div>
              <Progress value={metaPercentage} className="h-1.5 mt-2" />
              <div className="text-xs text-gray-500 text-right mt-1">{metaPercentage}% da meta</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center">
                <Users className="h-3.5 w-3.5 mr-1" />
                Aulas Experimentais
              </div>
              <div className="text-2xl font-bold text-emerald-500">{dashboardData.total_experimentais}</div>
              <div className="text-xs text-gray-500">
                {dashboardData.total_experimentais > 0 && dashboardData.total_contratos > 0
                  ? `Conversão: ${Math.round((1 - dashboardData.total_experimentais / dashboardData.total_contratos) * 100)}%`
                  : "Conversão: 0%"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center">
                <CreditCard className="h-3.5 w-3.5 mr-1" />
                Assinaturas
              </div>
              <div className="text-2xl font-bold text-green-600">{dashboardData.total_assinaturas}</div>
              <div className="text-xs text-gray-500">{formatCurrency(dashboardData.valor_assinaturas)}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center">
                <Tag className="h-3.5 w-3.5 mr-1" />
                Ticket Médio
              </div>
              <div className="text-2xl font-bold text-orange-500">
                {formatCurrency(dashboardData.ticket_medio_planos)}
              </div>
              <div className="text-xs text-gray-500">Por contrato</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600 sm:col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center">
                    <TrendingUp className="h-3.5 w-3.5 mr-1" />
                    Progresso da Meta
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{metaPercentage}%</div>
                  <div className="text-xs text-gray-500">
                    Meta: {formatCurrency(metaTotal)} | Restante: {formatCurrency(metaRestante)}
                  </div>
                </div>
                <div className="w-16 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Realizado", value: metaPercentage },
                          { name: "Restante", value: 100 - metaPercentage },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={30}
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        <Cell fill="#9333ea" />
                        <Cell fill="#e9d5ff" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Vendas Diárias</CardTitle>
                <div className="flex space-x-1">
                  <Button
                    variant={chartType === "line" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType("line")}
                  >
                    Linha
                  </Button>
                  <Button
                    variant={chartType === "bar" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType("bar")}
                  >
                    Barras
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "line" ? (
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis
                        tickFormatter={(value) =>
                          `R$${value.toLocaleString("pt-BR", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}`
                        }
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value)), "Vendas"]}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Vendas (R$)"
                        stroke="#0891b2"
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis
                        tickFormatter={(value) =>
                          `R$${value.toLocaleString("pt-BR", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}`
                        }
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value)), "Vendas"]}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="value" name="Vendas (R$)" fill="#0891b2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 5 Planos por Valor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.produtos_vendidos.map((produto, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <div className="ml-3 flex-grow">
                      <div className="text-sm font-medium truncate" title={produto.Product}>
                        {produto.Product.length > 25 ? produto.Product.substring(0, 25) + "..." : produto.Product}
                      </div>
                      <div className="text-sm text-gray-500">{formatCurrency(produto.Total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consultant Rankings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ranking de Vendas por Consultor</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Top seller highlight */}
            {dashboardData.ranking_consultores.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Trophy className="h-10 w-10 text-yellow-500" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold">{dashboardData.ranking_consultores[0].Consultor}</h3>
                    <p>
                      {formatCurrency(dashboardData.ranking_consultores[0].Total)} (
                      {dashboardData.ranking_consultores[0].Percentual}% das vendas)
                    </p>
                    <p className="mt-2 text-gray-600 italic">
                      Parabéns {dashboardData.ranking_consultores[0].Consultor}! Você é o destaque de vendas do mês de
                      abril. Continue com o excelente trabalho!
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">#</th>
                        <th className="text-left py-3 px-4 font-medium">Consultor</th>
                        <th className="text-right py-3 px-4 font-medium">Vendas</th>
                        <th className="text-right py-3 px-4 font-medium">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.ranking_consultores.map((consultor, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="w-7 h-7 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-semibold">
                              {index + 1}
                            </div>
                          </td>
                          <td className="py-3 px-4">{consultor.Consultor}</td>
                          <td className="text-right py-3 px-4">{formatCurrency(consultor.Total)}</td>
                          <td className="text-right py-3 px-4 text-green-600 font-semibold">{consultor.Percentual}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Aulas Experimentais por Consultor</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {dashboardData.ranking_experimentais.map((consultor, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-semibold">
                              {index + 1}
                            </div>
                            <span className="ml-2">{consultor.Consultor}</span>
                          </div>
                          <span className="font-medium">{consultor.Quantidade} aulas</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Analysis */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart2 className="h-5 w-5 mr-2" />
              Análise de KPIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-semibold text-gray-500 mb-2">Total de Vendas</div>
                <div className="text-2xl font-bold text-cyan-600">{formatCurrency(dashboardData.total_vendas)}</div>
                <div className="text-xs text-gray-500 mt-1">Soma de todos os valores na coluna 'TOTAL'</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-semibold text-gray-500 mb-2">Número de Contratos</div>
                <div className="text-2xl font-bold text-green-600">{dashboardData.total_contratos}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Contagem de células com dados nas colunas de categorização
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-semibold text-gray-500 mb-2">Ticket Médio</div>
                <div className="text-2xl font-bold text-orange-500">
                  {formatCurrency(dashboardData.ticket_medio_planos)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Total de Vendas ÷ Número de Contratos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Análise de Desempenho</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-medium mb-3">Análise Final</h3>
            <p className="mb-3">
              A análise dos dados de vendas da academia The Beat revela um negócio saudável com forte desempenho em
              várias categorias de produtos. As vendas totais somam{" "}
              <span className="text-green-600 font-semibold">{formatCurrency(dashboardData.total_vendas)}</span>, com
              uma média diária de vendas de
              <span className="text-green-600 font-semibold"> R$ 7.627,77</span>.
            </p>
            <p className="mb-3">
              A academia realizou com sucesso{" "}
              <span className="text-green-600 font-semibold">{dashboardData.total_experimentais}</span> aulas
              experimentais, que servem como um importante canal de aquisição de clientes. O ticket médio dos Planos é
              de{" "}
              <span className="text-green-600 font-semibold">{formatCurrency(dashboardData.ticket_medio_planos)}</span>,
              e o negócio vendeu um total de{" "}
              <span className="text-green-600 font-semibold">{dashboardData.total_assinaturas}</span> assinaturas.
            </p>

            <h4 className="text-base font-medium mb-2">Desempenho dos Consultores</h4>
            <p>
              Os três principais consultores (
              <span>
                {dashboardData.ranking_consultores
                  .slice(0, 3)
                  .map((c) => c.Consultor)
                  .join(", ")}
              </span>
              ) são responsáveis por mais de <span className="text-green-600 font-semibold">82%</span>
              das vendas totais, indicando uma concentração de desempenho de vendas entre alguns membros-chave da
              equipe.
            </p>
          </CardContent>
        </Card>

        {/* Settings and Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Configurações e Importação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-base font-medium mb-3">Meta de Vendas</h3>
                <div className="flex space-x-2">
                  <div className="relative flex-grow">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R$</span>
                    <Input
                      type="number"
                      value={metaInput}
                      onChange={(e) => setMetaInput(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleMetaUpdate}>Atualizar</Button>
                </div>
              </div>

              <div>
                <h3 className="text-base font-medium mb-3">Importar Arquivo</h3>
                <div
                  ref={uploadAreaRef}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center">
                    <FileText className="h-12 w-12 text-cyan-600 mb-2" />
                    <p>Clique ou arraste um arquivo aqui</p>
                    <p className="text-sm text-gray-500 mt-1">Formatos suportados: .xlsx, .xls, .csv</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        handleFileUpload(e.target.files[0])
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
