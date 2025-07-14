let chart;
let history = [];
let entryCounter = 1;

export function initUI() {
  const ctx = document.getElementById('chart').getContext('2d');

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Value',
        data: [],
        borderColor: 'rgba(75,192,192,1)',
        borderWidth: 2,
        fill: false,
        tension: 0.3
      }]
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Time' } },
        y: { title: { display: true, text: 'Value' } }
      },
      maintainAspectRatio: false
    }
  });

  document.getElementById('exportCsv').addEventListener('click', exportCSV);
}

export function updateMainValue(value) {
  document.getElementById('mainValue').textContent = value;
}

export function updateChart(timestamp, value) {
  chart.data.labels.push(timestamp);
  chart.data.datasets[0].data.push(value);
  chart.update();
}

export function appendToHistory(datetime, fn, value, unit) {
  const tableBody = document.getElementById('historyTable');
  const row = tableBody.insertRow();

  row.insertCell(0).textContent = entryCounter++;
  row.insertCell(1).textContent = datetime;
  row.insertCell(2).textContent = fn;
  row.insertCell(3).textContent = value;
  row.insertCell(4).textContent = unit;

  history.push({ datetime, fn, value, unit });
}

function produceCSV() {
  let csv = 'No,Date Time,Function,Value,Unit\n';
  history.forEach((entry, i) => {
    csv += `${i + 1},${entry.datetime},${entry.fn},${entry.value},${entry.unit}\n`;
  });
  
  return csv;
}

function exportCSV() {
  let csv = produceCSV();

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'history.csv';
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('reset').addEventListener('click', () => {
  chart.data.labels = [];
  chart.data.datasets.forEach(dataset => {
    dataset.data = [];
  });
  chart.update();

  const historyTable = document.getElementById('historyTable');
  historyTable.innerHTML = '';

  if (typeof history !== 'undefined') {
    history.length = 0;
  }

  document.getElementById('mainValue').textContent = '0.0000';
});

document.getElementById('downloadChart').addEventListener('click', () => {
  const canvas = document.getElementById('chart');
  const width = canvas.width;
  const height = canvas.height;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;

  const ctx = exportCanvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(canvas, 0, 0);

  const link = document.createElement('a');
  link.href = exportCanvas.toDataURL('image/png');
  link.download = `chart_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
  link.click();
});
