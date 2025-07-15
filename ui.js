let chart, barChart;
let history = [];
let entryCounter = 1;
let currentBarMax = 1;

export function initUI() {
  const ctx = document.getElementById('chart').getContext('2d');

  if(!chart) {
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
  }
  
  const ctxBarChart = document.getElementById('barGraph').getContext('2d');
  if(!barChart) {
	barChart = new Chart(ctxBarChart, {
	  type: 'bar',
	  data: {
		labels: [''],
		datasets: [{
		  label: '',
		  data: [0],
		  backgroundColor: '#007bff',
		  borderRadius: 4,
		  barThickness: 20
		}]
	  },
	  options: {
		indexAxis: 'y',
		animation: false,
		responsive: true,
		maintainAspectRatio: false,
		scales: {
		  x: {
			min: 0,
			max: 1,
			display: false,
			grid: {
			  display: false
			}
		  },
		  y: {
			display: false,
			grid: {
			  display: false
			}
		  }
		},
		plugins: {
		  legend: {
			display: false
		  }
		}
	  }
	});
  }

  document.getElementById('exportCsv').addEventListener('click', exportCSV);
  document.getElementById('reset').disabled = false;
  document.getElementById('exportCsv').disabled = false;
  document.getElementById('shareCsv').disabled = false;
  document.getElementById('downloadChart').disabled = false;
}

function updateBarGraph(parsed) {
  if (!barChart) return;

  let val = parseFloat(parsed.value);
  const unit = parsed.unit;
  const isVoltageOrCurrent = /[VA]/.test(unit);

  if (isNaN(val) || !isVoltageOrCurrent) {
    barChart.data.datasets[0].data[0] = 0;
    barChart.options.scales.x.max = 100;
    barChart.update();
    return;
  }

  val = Math.abs(val);

  const BAR_THRESHOLDS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  let newBarMax = BAR_THRESHOLDS.find(threshold => val <= threshold) || 1000;

  if (newBarMax > currentBarMax) {
    currentBarMax = newBarMax;
  }

  let displayUnit = 'V';
  let displayFactor = 1;

  if (currentBarMax < 1e-3) {
    displayUnit = 'µV';
    displayFactor = 1e6;
  } else if (currentBarMax < 1) {
    displayUnit = 'mV';
    displayFactor = 1e3;
  } else if (currentBarMax < 1000) {
    displayUnit = 'V';
    displayFactor = 1;
  } else {
    displayUnit = 'kV';
    displayFactor = 1e-3;
  }

  const stepSize = currentBarMax / 5;

  barChart.data.datasets[0].data[0] = val;
  barChart.options.scales.x = {
    min: 0,
    max: currentBarMax,
    ticks: {
      stepSize: stepSize,
      callback: function (value) {
        const scaled = (value * displayFactor).toFixed(1);
        return `${scaled} ${displayUnit}`;
      }
    },
    grid: {
      display: true,
      color: '#ccc'
    }
  };

  barChart.update();
}
export function updateMainView(parsed) {
  document.getElementById('mainValue').textContent = `${parsed.value} ${parsed.unit}`;
  document.getElementById('currentFunction').textContent = `Function: ${parsed.functionName}`;
  updateBarGraph(parsed);
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

export function setConnectionStatus(state) {
	if(state) {
		document.getElementById('connectionStatus').textContent = 'Connection status: Connected';
	} else {
		document.getElementById('connectionStatus').textContent = 'Connection status: Disconnected';
		document.getElementById('mainValue').textContent = 'Not connected';
	}
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

document.getElementById("shareCsv").addEventListener("click", async () => {
  let csv = produceCSV();

  const blob = new Blob([csv], { type: 'text/csv' });
  const file = new File([blob], "share.csv", { type: 'text/csv' });
  const fileArray = [ file ]
  
  const shareData = {
    files: [file],
    title: "Data export from UT71 Multimeter WebApp",
    text: "Please find the attached CSV data."
  };
  
  if (navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
    } catch (error) {
      alert("Sharing failed: " + error.message);
    }
  } else {
    alert("Sharing not supported.");
  }
});

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
