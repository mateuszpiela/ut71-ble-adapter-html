
const SERVICE_UUID = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
const RX_UUID = '49535343-1e4d-4bd9-ba61-23c647249616';
const TX_UUID = '49535343-8841-43f4-a8d4-ecbe34729bb3';

let device, server, service, rxChar, txChar;
let receiveBuffer = [];
let connected = false;

import { setConnectionStatus, initUI, updateMainView, updateChart, appendToHistory } from './ui.js';


const output = document.getElementById('output');

document.getElementById('connect').addEventListener('click', async () => {
  const btn = document.getElementById('connect');

  if (!connected) {
    try {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SERVICE_UUID]
      });

      server = await device.gatt.connect();
      service = await server.getPrimaryService(SERVICE_UUID);

      rxChar = await service.getCharacteristic(RX_UUID);
      txChar = await service.getCharacteristic(TX_UUID);

      await rxChar.startNotifications();
      rxChar.addEventListener('characteristicvaluechanged', handleNotification);

      connected = true;
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-danger');
      btn.textContent = 'Disconnect';
	  setConnectionStatus(connected);

      initUI();
    } catch (err) {
      console.error(err);
	  alert(`Cannot connect: ${err.message}`);
    }
  } else {
    try {
      if (rxChar) {
        await rxChar.stopNotifications();
        rxChar.removeEventListener('characteristicvaluechanged', handleNotification);
      }

      if (device && device.gatt.connected) {
        await device.gatt.disconnect();
      }

      connected = false;
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-primary');
      btn.textContent = 'Connect';
	  setConnectionStatus(connected);

    } catch (err) {
      console.error(err);
	  alert(`Cannot disconnect: ${err.message}`);
    }
  }
});
function handleNotification(event) {
  const value = event.target.value;
  const bytes = new Uint8Array(value.buffer);

  for (const byte of bytes) {
    receiveBuffer.push(byte);
  }

  if (receiveBuffer.length >= 11) {
    const chunk = receiveBuffer.slice(0, 11);
    receiveBuffer = receiveBuffer.slice(11);

    //console.log("🧩 Received full frame:", chunk.map(b => b.toString(16).padStart(2, '0')).join(' '));

    const parsed = parseUT71(Uint8Array.from(chunk));
	const now = new Date().toLocaleString().replace(',', '');

	updateMainView(parsed);
	
	updateChart(now, parseFloat(parsed.value));
	appendToHistory(now, parsed.functionName, parsed.value, parsed.unit);
	
    //output.textContent += `\n✅ ${parsed.value} ${parsed.unit} (${parsed.functionName})`;
  }
}

async function sendTX(data) {
  if (!txChar) return;
  await txChar.writeValue(new Uint8Array(data));
}

/* Reverse engineered from old IDMM app */
function parseUT71(data) {
  const FN_NAME = ["AC", "DC", "AC", "DC", "OHM", "CAP", "Temp", "DC", "DC", "DC", "Buzzer", "Diode", "Freq", "Temp", "空", "%(4-20mA)", "Duty", "AC", "AC", "AC"];
  const RANGE_MAP = {
    0: ["400mV"],
    1: ["0V", "4V", "40V", "400V", "1000V"],
    2: ["0V", "4V", "40V", "400V", "750V"],
    3: ["400mV"],
    4: ["0空", "400Ω", "4kΩ", "40kΩ", "400kΩ", "4MΩ", "40MΩ"],
    5: ["0nF", "40nF", "400nF", "4uF", "40uF", "400uF", "4mF", "40mF"],
    6: ["1000℃"],
    7: ["400uA", "4000uA"],
    8: ["40mA", "400mA"],
    9: ["0A", "10A"],
    12: ["40Hz", "400Hz", "4kHz", "40kHz", "400kHz", "4MHz", "40MHz", "400MHz"],
    13: ["1832℉"],
    15: ["100%"],
    16: ["100%"],
    17: ["400uA", "4000uA"],
    18: ["40mA", "400mA"],
    19: ["0A", "10A"]
  };	

  const full = Array.from(data);              
  const raw = full.map(v => v & 0x0F);      
  let valueStr = '';
  let flag = raw.slice(0, 5).some(d => d > 9) ? 1 : 0;

  if (!flag) {
    valueStr = raw.slice(0, 5).join('');
  }

  let rangeCode = raw[5];
  let fn = raw[6];

  if (fn === 7 && full[7] === 1) fn = 17;
  else if (fn === 8 && full[7] === 1) fn = 18;
  else if (fn === 9 && full[7] === 1) fn = 19;
  else if (fn === 12 && full[8] === 5) {
    rangeCode = 0;
    fn = 16;
  }

  const rangeStrs = RANGE_MAP[fn] || [];
  const rangeStr = rangeStrs[rangeCode] || '';
  const match = rangeStr.match(/(\d+)([^0-9]*)/);
  const range = match ? parseInt(match[1]) : 0;
  let unit = match ? match[2] : '';
  let functionName = FN_NAME[fn] || 'UNKNOWN';

  const acdcBits = full[7] & 0x0F;
  if (acdcBits === 3) functionName = 'AC+DC';
  else if (acdcBits === 2) functionName = 'DC';
  else if (acdcBits === 1) functionName = 'AC';

  if (!flag) {
    if (range < 10) valueStr = insertAt(valueStr, 1, '.');
    else if (range < 100) valueStr = insertAt(valueStr, 2, '.');
    else if (range < 1000) valueStr = insertAt(valueStr, 3, '.');
    else if (range < 10000) valueStr = insertAt(valueStr, 4, '.');

    if ((full[8] & 0x04) === 0x04) {
      valueStr = '-' + valueStr;
    }
  }

  return {
    value: flag ? 'ERR' : valueStr,
    unit: unit,
    functionName: functionName,
	range: rangeStr
  };
}

function insertAt(str, index, char) {
  return str.slice(0, index) + char + str.slice(index);
}


