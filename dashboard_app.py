import sys
import os
import webbrowser
import http.server
import socketserver
import threading
import pandas as pd
import json
from datetime import datetime
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import subprocess
import signal
import time
import shutil

class DashboardApp:
    def __init__(self, root):
        self.root = root
        self.root.title("THE BEAT - Dashboard de Vendas")
        self.root.geometry("600x400")
        self.root.configure(bg="#f8f9fa")
        
        # Definir variáveis
        self.server_process = None
        self.server_thread = None
        self.http_server = None
        self.dashboard_url = "http://localhost:8000/index.html"
        
        # Criar interface
        self.setup_ui()
        
        # Verificar se os arquivos necessários existem
        self.check_files()
        
        # Iniciar servidor HTTP
        self.start_http_server()
        
    def setup_ui(self):
        # Estilo
        style = ttk.Style()
        style.configure("TButton", font=("Segoe UI", 10), padding=10)
        style.configure("TLabel", font=("Segoe UI", 10), background="#f8f9fa")
        style.configure("Header.TLabel", font=("Segoe UI", 16, "bold"), background="#f8f9fa")
        style.configure("Subheader.TLabel", font=("Segoe UI", 12), background="#f8f9fa")
        
        # Cabeçalho
        header_frame = tk.Frame(self.root, bg="#17a2b8", padx=20, pady=20)
        header_frame.pack(fill=tk.X)
        
        header_label = tk.Label(
            header_frame, 
            text="THE BEAT - Dashboard de Vendas",
            font=("Segoe UI", 18, "bold"),
            bg="#17a2b8",
            fg="white"
        )
        header_label.pack()
        
        # Conteúdo principal
        main_frame = tk.Frame(self.root, bg="#f8f9fa", padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Instruções
        instructions_label = ttk.Label(
            main_frame, 
            text="Bem-vindo ao Dashboard de Vendas da THE BEAT",
            style="Header.TLabel"
        )
        instructions_label.pack(pady=(0, 10))
        
        instructions_text = ttk.Label(
            main_frame,
            text="Use os botões abaixo para gerenciar seu dashboard de vendas.",
            style="TLabel",
            wraplength=550
        )
        instructions_text.pack(pady=(0, 20))
        
        # Botões
        button_frame = tk.Frame(main_frame, bg="#f8f9fa")
        button_frame.pack(pady=10)
        
        self.view_dashboard_btn = ttk.Button(
            button_frame,
            text="Visualizar Dashboard",
            command=self.open_dashboard,
            style="TButton"
        )
        self.view_dashboard_btn.grid(row=0, column=0, padx=10, pady=10)
        
        self.import_file_btn = ttk.Button(
            button_frame,
            text="Importar Arquivo Excel",
            command=self.import_excel_file,
            style="TButton"
        )
        self.import_file_btn.grid(row=0, column=1, padx=10, pady=10)
        
        # Status
        self.status_var = tk.StringVar()
        self.status_var.set("Pronto para uso")
        
        status_frame = tk.Frame(self.root, bg="#f8f9fa", padx=20, pady=10)
        status_frame.pack(fill=tk.X, side=tk.BOTTOM)
        
        status_label = ttk.Label(
            status_frame,
            text="Status:",
            style="TLabel"
        )
        status_label.pack(side=tk.LEFT)
        
        self.status_text = ttk.Label(
            status_frame,
            textvariable=self.status_var,
            style="TLabel"
        )
        self.status_text.pack(side=tk.LEFT, padx=(5, 0))
        
    def check_files(self):
        required_files = ["index.html", "dashboard_data.json"]
        missing_files = []
        
        for file in required_files:
            if not os.path.exists(file):
                missing_files.append(file)
        
        if missing_files:
            messagebox.showerror(
                "Arquivos Ausentes",
                f"Os seguintes arquivos necessários não foram encontrados: {', '.join(missing_files)}\n\n"
                "O aplicativo pode não funcionar corretamente."
            )
    
    def start_http_server(self):
        # Iniciar servidor HTTP em uma thread separada
        self.status_var.set("Iniciando servidor...")
        
        def run_server():
            port = 8000
            handler = http.server.SimpleHTTPRequestHandler
            self.http_server = socketserver.TCPServer(("", port), handler)
            self.status_var.set(f"Servidor rodando na porta {port}")
            self.http_server.serve_forever()
        
        self.server_thread = threading.Thread(target=run_server)
        self.server_thread.daemon = True
        self.server_thread.start()
        
        # Aguardar um momento para o servidor iniciar
        time.sleep(1)
    
    def open_dashboard(self):
        # Abrir o dashboard no navegador padrão
        webbrowser.open(self.dashboard_url)
        self.status_var.set("Dashboard aberto no navegador")
    
    def import_excel_file(self):
        # Abrir diálogo para selecionar arquivo Excel
        file_path = filedialog.askopenfilename(
            title="Selecionar Arquivo Excel",
            filetypes=[("Arquivos Excel", "*.xlsx *.xls")]
        )
        
        if not file_path:
            return
        
        self.status_var.set("Processando arquivo...")
        self.root.update()
        
        try:
            # Processar o arquivo Excel
            self.process_excel_file(file_path)
            
            messagebox.showinfo(
                "Importação Concluída",
                "Arquivo Excel processado com sucesso!\n\n"
                "O dashboard foi atualizado com os novos dados."
            )
            
            self.status_var.set("Arquivo processado com sucesso")
        except Exception as e:
            messagebox.showerror(
                "Erro na Importação",
                f"Ocorreu um erro ao processar o arquivo:\n\n{str(e)}"
            )
            self.status_var.set("Erro ao processar arquivo")
    
    def process_excel_file(self, file_path):
        # Ler o arquivo Excel
        df = pd.read_excel(file_path)
        
        # Processar os dados (similar ao que temos no file_import.py)
        # Ajustar datas para o primeiro dia do mês principal
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Converter a coluna de data para datetime
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        
        # Identificar o mês principal (o mês com mais registros)
        month_counts = df['Date'].dt.month.value_counts()
        main_month = month_counts.idxmax() if not month_counts.empty else current_month
        
        # Ajustar todas as datas para o primeiro dia do mês principal
        df['Date'] = df.apply(
            lambda row: datetime(current_year, main_month, 1) if pd.notna(row['Date']) else None, 
            axis=1
        )
        
        # Calcular métricas
        total_vendas = df['Total'].sum()
        total_contratos = len(df)
        
        # Identificar aulas experimentais
        experimentais_df = df[df['Product'].str.contains('Experimental', case=False, na=False)]
        total_experimentais = len(experimentais_df)
        
        # Identificar assinaturas
        assinaturas_df = df[~df['Product'].str.contains('Experimental', case=False, na=False)]
        total_assinaturas = len(assinaturas_df)
        valor_assinaturas = assinaturas_df['Total'].sum()
        
        # Calcular ticket médio
        ticket_medio = total_vendas / total_contratos if total_contratos > 0 else 0
        
        # Agrupar vendas por dia
        vendas_por_dia = df.groupby(df['Date'].dt.strftime('%d/%m'))['Total'].sum().reset_index()
        vendas_por_dia_dict = {
            'labels': vendas_por_dia['Date'].tolist(),
            'values': vendas_por_dia['Total'].tolist()
        }
        
        # Ranking de consultores por vendas
        ranking_consultores = df.groupby('Consultant')['Total'].sum().reset_index()
        ranking_consultores = ranking_consultores.sort_values('Total', ascending=False)
        
        # Calcular percentual de cada consultor
        ranking_consultores['Percentual'] = (ranking_consultores['Total'] / total_vendas * 100).round(1)
        
        # Converter para lista de dicionários
        ranking_consultores_list = []
        for _, row in ranking_consultores.iterrows():
            ranking_consultores_list.append({
                'Consultor': row['Consultant'],
                'Total': row['Total'],
                'Percentual': row['Percentual']
            })
        
        # Ranking de consultores por aulas experimentais
        ranking_experimentais = experimentais_df.groupby('Consultant').size().reset_index(name='Quantidade')
        ranking_experimentais = ranking_experimentais.sort_values('Quantidade', ascending=False)
        
        # Converter para lista de dicionários
        ranking_experimentais_list = []
        for _, row in ranking_experimentais.iterrows():
            ranking_experimentais_list.append({
                'Consultor': row['Consultant'],
                'Quantidade': int(row['Quantidade'])
            })
        
        # Produtos mais vendidos
        produtos_vendidos = df.groupby('Product').agg({
            'Total': 'sum',
            'Product': 'count'
        }).reset_index()
        
        produtos_vendidos.columns = ['Product', 'Total', 'Quantidade']
        produtos_vendidos = produtos_vendidos.sort_values('Total', ascending=False)
        
        # Converter para lista de dicionários
        produtos_vendidos_list = []
        for _, row in produtos_vendidos.iterrows():
            produtos_vendidos_list.append({
                'Product': row['Product'],
                'Total': row['Total'],
                'Quantidade': int(row['Quantidade'])
            })
        
        # Criar o objeto de dados final
        data = {
            'total_vendas': float(total_vendas),
            'total_contratos': int(total_contratos),
            'total_experimentais': int(total_experimentais),
            'total_assinaturas': int(total_assinaturas),
            'valor_assinaturas': float(valor_assinaturas),
            'ticket_medio_planos': float(ticket_medio),
            'vendas_por_dia': vendas_por_dia_dict,
            'ranking_consultores': ranking_consultores_list,
            'ranking_experimentais': ranking_experimentais_list,
            'produtos_vendidos': produtos_vendidos_list,
            'ultima_atualizacao': datetime.now().strftime('%d/%m/%Y %H:%M')
        }
        
        # Salvar os dados processados em um arquivo JSON
        with open('dashboard_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def on_closing(self):
        # Parar o servidor HTTP ao fechar o aplicativo
        if self.http_server:
            self.http_server.shutdown()
        
        self.root.destroy()

def main():
    # Verificar se estamos no diretório correto
    if not os.path.exists('index.html'):
        # Tentar encontrar o diretório correto
        script_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(script_dir)
    
    # Iniciar a aplicação
    root = tk.Tk()
    app = DashboardApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()

if __name__ == "__main__":
    main()
