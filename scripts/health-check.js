#!/usr/bin/env node

/**
 * Skylink Enterprise NVR - Health Check Script
 * Used for monitoring and Docker health checks
 */

const http = require('http');
const process = require('process');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';
const TIMEOUT = 5000; // 5 seconds

function healthCheck() {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: HOST,
            port: PORT,
            path: '/api/health',
            method: 'GET',
            timeout: TIMEOUT
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const health = JSON.parse(data);
                        resolve(health);
                    } catch (error) {
                        reject(new Error('Invalid health response format'));
                    }
                } else {
                    reject(new Error(`Health check failed with status ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error(`Health check request failed: ${error.message}`));
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Health check timed out'));
        });
        
        req.end();
    });
}

async function main() {
    try {
        console.log(`Checking health at http://${HOST}:${PORT}/api/health`);
        
        const health = await healthCheck();
        
        console.log('✅ Health check passed');
        console.log(`Status: ${health.status}`);
        console.log(`Timestamp: ${health.timestamp}`);
        
        if (health.database) {
            console.log(`Database: ${health.database.status}`);
        }
        
        if (health.services) {
            console.log('Services:');
            Object.entries(health.services).forEach(([service, status]) => {
                console.log(`  ${service}: ${status}`);
            });
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        process.exit(1);
    }
}

// Handle command line usage
if (require.main === module) {
    main();
}

module.exports = { healthCheck };