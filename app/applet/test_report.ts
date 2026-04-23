import http from 'http';

const data = JSON.stringify({
  client_id: 0,
  technician_id: 0,
  machine_id: 0,
  company_id: 0,
  description: "Test",
  days: [{ date: "2026-03-10", travel_hours: 1, work_hours: 2, meals: 0, overnight: false }],
  items: []
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/reports',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
