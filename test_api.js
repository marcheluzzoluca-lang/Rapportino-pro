
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/dashboard');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body start:', text.substring(0, 100));
  } catch (e) {
    console.error('Test failed:', e);
  }
}
test();
