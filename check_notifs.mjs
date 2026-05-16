const BASE = 'https://soil-iot-system-default-rtdb.asia-southeast1.firebasedatabase.app';

const notifs = await fetch(`${BASE}/notifications.json`).then(r => r.json());

console.log('=== ALL NOTIFICATIONS (by Firebase key, newest first) ===');
const sorted = Object.entries(notifs || {})
  .sort((a, b) => b[0].localeCompare(a[0]))
  .slice(0, 15);

sorted.forEach(([k, v]) => {
  console.log(`  ${k} | "${v.message}" | raw timestamp: "${v.timestamp}" | type: ${v.type}`);
});
