import net from 'net';

const checkPort = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer()
            .once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(true); // Port is in use (server is running)
                } else {
                    resolve(false);
                }
            })
            .once('listening', () => {
                server.close();
                resolve(false); // Port is free
            })
            .listen(port, '127.0.0.1');
    });
};

async function run() {
    const ports = [5000, 5173, 3000, 8000];
    for (const port of ports) {
        const active = await checkPort(port);
        console.log(`Port ${port} is ${active ? 'ACTIVE' : 'FREE'}`);
    }
}

run();
