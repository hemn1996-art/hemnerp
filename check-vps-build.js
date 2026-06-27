const { Client } = require('ssh2');

const conn = new Client();
const config = {
  host: '209.38.209.69',
  port: 22,
  username: 'root',
  password: 'Hemn@ERP2026#Strong',
  readyTimeout: 30000
};

conn.on('ready', () => {
  conn.exec('ls -la /var/www/hemnerp/.next && pm2 status', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', data => process.stdout.write(data))
          .stderr.on('data', data => process.stderr.write(data));
  });
}).connect(config);
