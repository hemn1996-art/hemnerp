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
sed -i 's/DATABASE_URL="postgresql:\\/\\/postgres.xjjilptidbrekoptqpde:GoxlanPass2026@aws-1-eu-central-1.pooler.supabase.com:5432\\/postgres"/DATABASE_URL="postgresql:\\/\\/postgres.xjjilptidbrekoptqpde:GoxlanPass2026@aws-1-eu-central-1.pooler.supabase.com:6543\\/postgres?pgbouncer=true"/g' .env
cat .env
`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', data => process.stdout.write(data))
          .stderr.on('data', data => process.stderr.write(data));
  });
}).connect(config);
