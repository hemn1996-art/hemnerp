const http = require('http');

http.get('http://209.38.209.69/api/reports/stock', {
  headers: {
    'Host': 'hemnerp.org' // nginx requires correct host header
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, '\nResponse:', data));
}).on('error', err => console.error(err));
