import http from 'http';

const data = JSON.stringify({
  name: "Test Client",
  address: "Test Address",
  phone: "123",
  email: "test@test.com",
  km: 10,
  machines: []
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/clients',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`Client statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
