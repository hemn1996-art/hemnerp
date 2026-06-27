const https = require('https');

async function hammer() {
  const promises = [];
  for(let i=0; i<30; i++) {
    promises.push(new Promise((resolve) => {
      https.get('https://hemnerp.org/api/reports/stock', {
        headers: {
          'Cookie': 'user_session=%7B%22id%22%3A1%2C%22username%22%3A%22admin%22%2C%22role%22%3A%22ADMIN%22%7D'
        }
      }, (res) => {
        resolve(res.statusCode);
      }).on('error', () => resolve('error'));
    }));
  }
  const results = await Promise.all(promises);
  const statusCounts = results.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  console.log('Results:', statusCounts);
}

hammer();
