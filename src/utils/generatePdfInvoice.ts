import { SystemUser } from '../types/auction';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  lotNumber: string;
  lotTitle: string;
  quantity: number;
  grade: string;
  totalUsd: number;
  usdRate: number;
  user: SystemUser;
  warehouseStatus: string;
}

export const downloadOfficialInvoicePdf = (data: InvoiceData) => {
  const totalBrl = data.totalUsd * data.usdRate;
  const unitUsd = data.quantity > 0 ? data.totalUsd / data.quantity : data.totalUsd;
  const unitBrl = unitUsd * data.usdRate;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Invoice Oficial - ${data.invoiceNumber}</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 30px;
          background-color: #f8fafc;
          color: #0f172a;
        }
        .invoice-box {
          max-width: 850px;
          margin: auto;
          padding: 40px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
          border-radius: 12px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0b0f17;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f172a;
          font-weight: 900;
          font-size: 22px;
        }
        .brand-title {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #0b0f17;
          line-height: 1.1;
        }
        .brand-subtitle {
          font-size: 11px;
          color: #d97706;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .invoice-title {
          text-align: right;
        }
        .invoice-title h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 900;
          color: #0b0f17;
        }
        .invoice-title p {
          margin: 4px 0 0 0;
          font-size: 12px;
          font-family: monospace;
          color: #64748b;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        .info-card {
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
        }
        .info-card h3 {
          margin: 0 0 10px 0;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.5px;
        }
        .info-card p {
          margin: 3px 0;
          font-size: 13px;
          color: #1e293b;
        }
        .info-card strong {
          color: #0f172a;
        }
        .status-badge {
          display: inline-block;
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          margin-top: 6px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .items-table th {
          background: #0b0f17;
          color: #ffffff;
          padding: 12px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
        }
        .items-table td {
          padding: 14px 12px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 13px;
        }
        .total-box {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 30px;
        }
        .total-table {
          width: 320px;
          border-collapse: collapse;
        }
        .total-table td {
          padding: 8px 12px;
          font-size: 13px;
        }
        .total-table .grand-total {
          background: #0f172a;
          color: #fbbf24;
          font-weight: 900;
          font-size: 16px;
          font-family: monospace;
        }
        .footer-stamp {
          border-top: 2px dashed #cbd5e1;
          padding-top: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #64748b;
        }
        .action-bar {
          margin-bottom: 20px;
          text-align: right;
        }
        .btn-print {
          background: #059669;
          color: #fff;
          border: none;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
        }
        .btn-print:hover { background: #047857; }
      </style>
    </head>
    <body>
      <div class="action-bar no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
      </div>

      <div class="invoice-box">
        <div class="header">
          <div class="logo-container">
            <div class="logo-icon">⚖️</div>
            <div>
              <div class="brand-title">USAFAST LEILÕES HUB</div>
              <div class="brand-subtitle">PORTAL DO IMPORTADOR BRASIL & USA LOGISTICS</div>
            </div>
          </div>
          <div class="invoice-title">
            <h1>INVOICE OFICIAL</h1>
            <p>Nº: ${data.invoiceNumber}</p>
            <p>Data: ${data.date}</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <h3>Dados do Arrematante (Comprador)</h3>
            <p><strong>Nome / Razão:</strong> ${data.user.name}</p>
            <p><strong>CPF / CNPJ:</strong> ${data.user.cpfCnpj}</p>
            <p><strong>E-mail:</strong> ${data.user.email}</p>
            <p><strong>Telefone:</strong> ${data.user.phone}</p>
          </div>

          <div class="info-card">
            <h3>Galpão de Recebimento em Miami</h3>
            <p><strong>Local de Armazenamento:</strong> USAFAST DORAL HUB</p>
            <p><strong>Endereço:</strong> 8400 NW 36th St, Suite 450 - Doral, FL 33166 - USA</p>
            <p><strong>Status do Lote:</strong> ${data.warehouseStatus}</p>
            <div class="status-badge">● HOMOLOGADO & ARREMATADO</div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Cód. Lote</th>
              <th>Descrição do Produto / Lote Master</th>
              <th>Grade</th>
              <th>Qtd</th>
              <th>Unit. (USD)</th>
              <th>Total (USD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-family: monospace; font-weight: bold;">${data.lotNumber}</td>
              <td><strong>${data.lotTitle}</strong><br/><small style="color: #64748b;">Processado via Leilão Oficial USAFAST</small></td>
              <td style="font-weight: bold;">${data.grade}</td>
              <td style="font-weight: bold;">${data.quantity}</td>
              <td style="font-family: monospace;">$${unitUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="font-family: monospace; font-weight: bold;">$${data.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-box">
          <table class="total-table">
            <tr>
              <td>Subtotal (USD):</td>
              <td style="text-align: right; font-family: monospace;">$${data.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Taxa PTAX Utilizada:</td>
              <td style="text-align: right; font-family: monospace;">R$ ${data.usdRate.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Total Estimado em BRL:</td>
              <td style="text-align: right; font-family: monospace;">R$ ${totalBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr class="grand-total">
              <td style="padding: 12px;">TOTAL DA INVOICE:</td>
              <td style="text-align: right; padding: 12px;">$${data.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</td>
            </tr>
          </table>
        </div>

        <div class="footer-stamp">
          <div>
            <strong>USAFAST LEILÕES HUB MIAMI LLC</strong><br/>
            Laudo de Autenticidade & Clean ESN Auditado em Doral, FL.
          </div>
          <div style="font-family: monospace; text-align: right; color: #94a3b8;">
            AUTENTICAÇÃO ELETRÔNICA: ${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};
