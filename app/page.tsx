"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import DashboardAnalysis from "@/components/dashboard-analysis"

export default function Dashboard() {
  const [csvData, setCsvData] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [fileProcessingInfo, setFileProcessingInfo] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState("15/04/2025 16:51")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

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
      // Process CSV file
      const text = await file.text()
      setCsvData(text)

      // Update last update time
      const now = new Date()
      const formattedDate =
        now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      setLastUpdate(formattedDate)

      toast({
        title: "Arquivo importado com sucesso",
        description: "O dashboard foi atualizado com os novos dados.",
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

        {/* File upload area */}
        <div className="mb-6">
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

        {/* Dashboard Analysis */}
        {csvData ? (
          <DashboardAnalysis csvData={csvData} lastUpdate={lastUpdate} />
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Bem-vindo ao Dashboard de Vendas</h2>
            <p className="text-gray-600 mb-4">
              Faça upload de um arquivo CSV ou Excel para visualizar a análise de vendas.
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>Selecionar Arquivo</Button>
          </div>
        )}
      </div>
    </div>
  )
}
