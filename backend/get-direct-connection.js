import dns from 'dns';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const resolveSrv = promisify(dns.resolveSrv);
const resolveTxt = promisify(dns.resolveTxt);

async function getDirectConnectionString() {
    try {
        const mongoUrl = process.env.MONGO_URL;
        
        if (!mongoUrl) {
            console.error('❌ MONGO_URL not found in .env file');
            process.exit(1);
        }

        console.log('🔍 Current MongoDB URL:', mongoUrl);
        console.log('');

        // Check if it's an SRV connection string
        if (!mongoUrl.startsWith('mongodb+srv://')) {
            console.log('✅ Already using direct connection string!');
            console.log('If you still have connection issues, check:');
            console.log('1. MongoDB Atlas IP Whitelist (Network Access)');
            console.log('2. Database user credentials');
            console.log('3. Internet connection');
            return;
        }

        // Parse the SRV URL
        const urlPattern = /mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)(\/.*)?/;
        const match = mongoUrl.match(urlPattern);

        if (!match) {
            console.error('❌ Invalid MongoDB SRV URL format');
            process.exit(1);
        }

        const [, username, password, host, params] = match;
        const srvRecord = `_mongodb._tcp.${host}`;

        console.log('🔄 Resolving DNS SRV records...');
        console.log(`   Looking up: ${srvRecord}`);
        console.log('');

        // Try multiple DNS servers
        const dnsServers = [
            '8.8.8.8',      // Google DNS
            '1.1.1.1',      // Cloudflare DNS
            '208.67.222.222' // OpenDNS
        ];

        let srvRecords = null;
        let txtRecords = null;
        let usedDns = null;

        for (const dnsServer of dnsServers) {
            try {
                console.log(`   Trying DNS server: ${dnsServer}...`);
                dns.setServers([dnsServer]);
                
                srvRecords = await resolveSrv(srvRecord);
                txtRecords = await resolveTxt(host);
                usedDns = dnsServer;
                
                console.log(`   ✅ Success with ${dnsServer}!`);
                break;
            } catch (err) {
                console.log(`   ❌ Failed with ${dnsServer}: ${err.message}`);
            }
        }

        if (!srvRecords || srvRecords.length === 0) {
            console.error('');
            console.error('❌ Could not resolve MongoDB SRV records with any DNS server!');
            console.error('');
            console.error('🔧 MANUAL FIX REQUIRED:');
            console.error('');
            console.error('1. Go to MongoDB Atlas: https://cloud.mongodb.com/');
            console.error('2. Click on your cluster → "Connect"');
            console.error('3. Choose "Connect your application"');
            console.error('4. Select "Node.js" driver');
            console.error('5. Copy the connection string');
            console.error('6. Replace MONGO_URL in your .env file');
            console.error('');
            console.error('OR use this format (replace with your actual values):');
            console.error('');
            console.error('MONGO_URL=mongodb://USERNAME:PASSWORD@host1:27017,host2:27017,host3:27017/DATABASE?ssl=true&replicaSet=REPLICA_SET_NAME&authSource=admin&retryWrites=true&w=majority');
            console.error('');
            process.exit(1);
        }

        // Parse TXT records for additional options
        let replicaSet = '';
        let authSource = 'admin';

        if (txtRecords && txtRecords.length > 0) {
            const txtString = txtRecords[0].join('');
            const rsMatch = txtString.match(/replicaSet=([^&]+)/);
            const authMatch = txtString.match(/authSource=([^&]+)/);
            
            if (rsMatch) replicaSet = rsMatch[1];
            if (authMatch) authSource = authMatch[1];
        }

        // Build the direct connection string
        const hosts = srvRecords.map(record => `${record.name}:${record.port}`).join(',');
        const database = params ? params.split('?')[0].substring(1) : '';
        
        let directUrl = `mongodb://${username}:${password}@${hosts}`;
        
        if (database) {
            directUrl += `/${database}`;
        }
        
        const queryParams = [];
        queryParams.push('ssl=true');
        if (replicaSet) queryParams.push(`replicaSet=${replicaSet}`);
        queryParams.push(`authSource=${authSource}`);
        queryParams.push('retryWrites=true');
        queryParams.push('w=majority');
        
        directUrl += '?' + queryParams.join('&');

        console.log('');
        console.log('✅ Successfully resolved SRV records!');
        console.log('');
        console.log('📋 Found MongoDB Hosts:');
        srvRecords.forEach((record, i) => {
            console.log(`   ${i + 1}. ${record.name}:${record.port}`);
        });
        console.log('');
        console.log('🔧 DIRECT CONNECTION STRING:');
        console.log('');
        console.log('Copy this to your .env file as MONGO_URL:');
        console.log('');
        console.log('─'.repeat(80));
        console.log(directUrl);
        console.log('─'.repeat(80));
        console.log('');
        console.log('💡 This connection string bypasses DNS SRV lookup!');
        console.log(`   (Resolved using DNS server: ${usedDns})`);
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('');
        console.error('🔧 Please manually get your connection string from MongoDB Atlas:');
        console.error('   https://cloud.mongodb.com/');
        process.exit(1);
    }
}

getDirectConnectionString();
