import net from 'net';

const hosts = [
    { name: 'Google DNS', host: '8.8.8.8', port: 53 },
    { name: 'Cloudflare DNS', host: '1.1.1.1', port: 53 },
    { name: 'MongoDB Atlas (Example)', host: 'cluster0.rhvicvr.mongodb.net', port: 27017 },
];

console.log('🔍 Testing Network Connectivity...\n');

async function testConnection(name, host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 5000;

        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            console.log(`✅ ${name}: Connected to ${host}:${port}`);
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            console.log(`❌ ${name}: Timeout connecting to ${host}:${port}`);
            socket.destroy();
            resolve(false);
        });

        socket.on('error', (err) => {
            console.log(`❌ ${name}: Error - ${err.message}`);
            socket.destroy();
            resolve(false);
        });

        socket.connect(port, host);
    });
}

async function runTests() {
    for (const { name, host, port } of hosts) {
        await testConnection(name, host, port);
    }
    
    console.log('\n📊 Diagnosis:');
    console.log('─'.repeat(60));
    console.log('If DNS servers (8.8.8.8, 1.1.1.1) are ❌:');
    console.log('  → Your firewall is blocking outbound DNS queries');
    console.log('  → Contact your network administrator');
    console.log('');
    console.log('If MongoDB Atlas is ❌:');
    console.log('  → Port 27017 might be blocked');
    console.log('  → Check MongoDB Atlas IP Whitelist');
    console.log('  → Try using MongoDB Atlas via VPN');
    console.log('─'.repeat(60));
}

runTests();
