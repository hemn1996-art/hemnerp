const { Client } = require('ssh2');

const conn = new Client();

console.log("Connecting to VPS...");

const config = {
  host: '209.38.209.69',
  port: 22,
  username: 'root',
  password: 'Hemn@ERP2026#Strong',
  readyTimeout: 30000,
  keepaliveInterval: 10000
};

const commands = 'pkill -f "next build" 2>/dev/null; sleep 3; cd /var/www/hemnerp && git fetch --all && git reset --hard origin/main && rm -rf .next && npm run build && pm2 restart hemnerp';

conn.on('ready', () => {
  console.log('Connected!');
  
  conn.shell((err, stream) => {
    if (err) {
      console.error('Error:', err);
      conn.end();
      return;
    }
    
    let output = '';
    stream.on('close', () => {
      console.log('\nDone!');
      conn.end();
    }).on('data', (data) => {
      const str = data.toString();
      output += str;
      process.stdout.write(data);
      // Auto-close when pm2 restart completes
      if (str.includes('pm2 restart') || output.includes('│ online')) {
        setTimeout(() => {
          stream.end('exit\n');
        }, 2000);
      }
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    // Send the commands
    stream.write(commands + '\n');
  });
}).connect(config);
