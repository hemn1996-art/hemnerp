const { Client } = require('ssh2');

const conn = new Client();
const config = {
  host: '209.38.209.69',
  port: 22,
  username: 'root',
  password: 'Hemn@ERP2026#Strong',
  readyTimeout: 30000
};

const cmd = `
cd /var/www/hemnerp
pm2 stop all || true
rm -rf .next
rm -rf node_modules/.cache
export $(grep -v '^#' .env | xargs)
nohup sh -c "npx prisma generate && npx next build && pm2 start all" > build-fixed.log 2>&1 &
`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', data => process.stdout.write(data))
          .stderr.on('data', data => process.stderr.write(data));
  });
}).connect(config);
