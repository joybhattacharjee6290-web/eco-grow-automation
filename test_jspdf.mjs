import { jsPDF } from 'jspdf';
import fs from 'fs';

async function main() {
  const name = "Soil Moisture";
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const m = 15; // margin
  let y = m;

  // ── Title ──
  pdf.setFontSize(18);
  pdf.setTextColor(15, 118, 110);
  pdf.text(`${name} — Historical Logs (24h)`, pw / 2, y, { align: 'center' });
  y += 10;

  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`Generated on ${new Date().toLocaleString()} • Data interval: 1 hour`, pw / 2, y, { align: 'center' });
  y += 12;

  // ── Chart area ──
  const chartX = m + 15;
  const chartY = y;
  const chartW = pw - m * 2 - 20;
  const chartH = 70;

  const yPoints = 5;
  const cMax = 100;
  const cMin = 0;
  const yDecimals = 1;
  const unit = "%";

  // Y-axis labels & gridlines
  pdf.setFontSize(7);
  pdf.setTextColor(100);
  const yDivs = yPoints - 1;
  for (let i = 0; i < yPoints; i++) {
    const val = cMax - (i / yDivs) * (cMax - cMin);
    const ly = chartY + (i / yDivs) * chartH;
    const label = yDecimals > 0 ? val.toFixed(yDecimals) : Math.round(val).toString();
    pdf.text(`${label}${unit}`, chartX - 2, ly + 1, { align: 'right' });
    pdf.setDrawColor(220);
    pdf.setLineWidth(0.2);
    pdf.line(chartX, ly, chartX + chartW, ly);
  }

  // Axes
  pdf.setDrawColor(150);
  pdf.setLineWidth(0.3);
  pdf.line(chartX, chartY, chartX, chartY + chartH); // Y
  pdf.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH); // X

  const histData = Array(24).fill(50);
  const strokeColor = "#14b8a6";
  const hourLabels = ["1", "2", "3"];

  // Plot data points + line
  if (histData.length > 1) {
    const cRange = cMax - cMin || 1;
    const pts = histData.map((val, i) => ({
      x: chartX + (i / (histData.length - 1)) * chartW,
      y: chartY + chartH - ((val - cMin) / cRange) * chartH,
    }));

    // Line
    const r = parseInt(strokeColor.slice(1, 3), 16);
    const g = parseInt(strokeColor.slice(3, 5), 16);
    const b = parseInt(strokeColor.slice(5, 7), 16);
    pdf.setDrawColor(r, g, b);
    pdf.setLineWidth(0.8);
    for (let i = 0; i < pts.length - 1; i++) {
      pdf.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }

    // Dots
    pdf.setFillColor(r, g, b);
    pts.forEach(p => pdf.circle(p.x, p.y, 1, 'F'));
  }

  // X-axis labels (every 2nd)
  pdf.setFontSize(6);
  pdf.setTextColor(100);
  hourLabels.forEach((label, i) => {
    if (i % 2 === 0) {
      const lx = chartX + (i / (hourLabels.length - 1)) * chartW;
      pdf.text(label, lx, chartY + chartH + 5, { align: 'center' });
    }
  });

  y = chartY + chartH + 15;

  // ── Data Table ──
  const colW = [(pw - m * 2) * 0.3, (pw - m * 2) * 0.3, (pw - m * 2) * 0.4];
  const colX = [m, m + colW[0], m + colW[0] + colW[1]];
  const rowH = 7;

  // Header
  pdf.setFillColor(15, 118, 110);
  pdf.rect(m, y, pw - m * 2, rowH, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(255);
  pdf.text('Date', colX[0] + 3, y + 5);
  pdf.text('Time', colX[1] + 3, y + 5);
  pdf.text('Data', colX[2] + 3, y + 5);
  y += rowH;

  // Rows
  pdf.setFontSize(8);
  histData.forEach((value, i) => {
    if (y + rowH > ph - m) {
      pdf.addPage();
      y = m;
    }

    if (i % 2 === 0) {
      pdf.setFillColor(240, 253, 244);
      pdf.rect(m, y, pw - m * 2, rowH, 'F');
    }

    const dt = new Date(Date.now() - (23 - i) * 60 * 60 * 1000);
    const date = `${dt.getDate()}.${dt.getMonth() + 1}.${String(dt.getFullYear()).slice(2)}`;
    const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const formatted = yDecimals > 0 ? value.toFixed(yDecimals) : value.toFixed(1);

    pdf.setTextColor(30);
    pdf.text(date, colX[0] + 3, y + 5);
    pdf.text(time, colX[1] + 3, y + 5);
    pdf.text(`${formatted}${unit}`, colX[2] + 3, y + 5);

    // Row border
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(m, y + rowH, pw - m, y + rowH);

    y += rowH;
  });

  const arrayBuffer = pdf.output('arraybuffer');
  fs.writeFileSync('test.pdf', Buffer.from(arrayBuffer));
}
main();
