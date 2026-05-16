const BASE = 'https://soil-iot-system-default-rtdb.asia-southeast1.firebasedatabase.app';

const DURATION_SEC = 30;

async function run() {
  console.log('🔥 Setting Fire alert to TRUE ...');
  const res1 = await fetch(`${BASE}/Alerts.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Fire: true }),
  });
  const data1 = await res1.json();
  console.log('   Firebase response:', data1);
  console.log(`⏱️  Fire alert active — waiting ${DURATION_SEC} seconds ...`);

  for (let i = DURATION_SEC; i > 0; i--) {
    process.stdout.write(`\r   ${i}s remaining ...  `);
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log('\r   0s remaining — clearing alert.');

  console.log('✅ Setting Fire alert to FALSE ...');
  const res2 = await fetch(`${BASE}/Alerts.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Fire: false }),
  });
  const data2 = await res2.json();
  console.log('   Firebase response:', data2);
  console.log('🏁 Done. Fire alert test complete.');
}

run().catch(console.error);
