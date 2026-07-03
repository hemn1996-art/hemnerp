const { Client } = require('ssh2');

const conn = new Client();

console.log("Connecting to VPS (209.38.209.69)...");

const config = {
  host: '209.38.209.69',
  port: 22,
  username: 'root',
  password: 'Hemn@ERP2026#Strong'
};

const commands = 'cd /var/www/hemnerp && git remote prune origin && git pull && npm run build && pm2 restart hemnerp';

conn.on('ready', () => {
  console.log('SSH connection established successfully!');
  console.log(`Executing commands: ${commands}`);
  
  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('Error executing commands:', err);
      conn.end();
      return;
    }
    
    stream.on('close', (code, signal) => {
      console.log(`SSH connection closed with exit code: ${code}`);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect(config);
