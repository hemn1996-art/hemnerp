const https = require('https');

https.get('https://hemnerp.org/api/reports/stock', {
  headers: {
    'Cookie': 'user_session=%7B%22id%22%3A1%2C%22username%22%3A%22admin%22%2C%22role%22%3A%22ADMIN%22%7D'
  }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('Status:', res.statusCode, 'Data:', data));
}).on('error', console.error);
