/**
 * Automated Verification Script for UIRMS Backend
 * Tests core utilities, route handling, security middlewares, and health status
 */

const { createApp } = require('./dist/server');
const { generateOTP } = require('./dist/utils/helpers');
const { hashPassword, comparePassword, generateRandomPassword } = require('./dist/utils/password');
const { generateToken, verifyToken } = require('./dist/utils/jwt');
const http = require('http');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failedTests++;
  }
}

function simulateRequest(app, method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = url;
    req.headers = { host: 'localhost', ...headers };
    if (body) {
      req.headers['content-type'] = 'application/json';
      req.body = body;
    }

    let statusCode = 200;
    let responseBody = '';
    const resHeaders = {};

    const res = {
      setHeader(name, val) { resHeaders[name] = val; },
      getHeader(name) { return resHeaders[name]; },
      status(code) { statusCode = code; return res; },
      json(data) { responseBody = JSON.stringify(data); this.end(); },
      send(data) { responseBody = data; this.end(); },
      end(data) {
        if (data && typeof data === 'string') responseBody += data;
        let json = null;
        try { json = JSON.parse(responseBody); } catch (_) {}
        resolve({ statusCode, body: responseBody, json, headers: resHeaders });
      }
    };

    app.handle(req, res);
  });
}

async function run() {
  console.log('\n========================================');
  console.log('   UIRMS BACKEND AUTOMATED TEST SUITE   ');
  console.log('========================================\n');

  // Test 1: Crypto Utilities
  console.log('1. Testing Security Utilities:');
  const otp = generateOTP(6);
  assert(/^\d{6}$/.test(otp), 'generateOTP() generates valid 6-digit numeric OTP');

  const randPwd = generateRandomPassword(16);
  assert(randPwd.length === 16, 'generateRandomPassword(16) produces correct length');

  const plainPwd = 'Password@123';
  const hashed = await hashPassword(plainPwd);
  assert(hashed.startsWith('$2b$'), 'hashPassword() generates valid bcrypt hash');

  const match = await comparePassword(plainPwd, hashed);
  assert(match === true, 'comparePassword() validates matching password');

  const mismatch = await comparePassword('WrongPassword', hashed);
  assert(mismatch === false, 'comparePassword() rejects incorrect password');

  // Test 2: JWT Utilities
  console.log('\n2. Testing JWT Utilities:');
  const payload = { id: 1, email: 'test@uirms.vn', role: 'user' };
  const token = generateToken(payload, '1h');
  assert(typeof token === 'string' && token.length > 20, 'generateToken() returns valid token string');

  const decoded = verifyToken(token);
  assert(decoded && decoded.id === 1 && decoded.role === 'user', 'verifyToken() decodes payload correctly');

  // Test 3: Express Server & Routing
  console.log('\n3. Testing Express App & Health Check:');
  const app = createApp();

  const healthRes = await simulateRequest(app, 'GET', '/api/health');
  assert(healthRes.statusCode === 200, 'GET /api/health returns 200 OK');
  assert(healthRes.json && healthRes.json.status === 'OK', 'Health check body reports status OK');

  // Test 4: Static File Auth Protection
  console.log('\n4. Testing /uploads Security Protection:');
  const unauthUpload = await simulateRequest(app, 'GET', '/uploads/secret_incident.jpg');
  assert(unauthUpload.statusCode === 401, 'GET /uploads without token is blocked with 401 Unauthorized');

  const authUpload = await simulateRequest(app, 'GET', '/uploads/nonexistent.jpg', {
    authorization: `Bearer ${token}`
  });
  // Since the file does not exist, it should pass auth and return 404 Not Found (not 401)
  assert(authUpload.statusCode === 404, 'GET /uploads with valid JWT passes auth check (returns 404 for missing file)');

  // Test 5: Missing Route Handling
  console.log('\n5. Testing 404 Route Handling:');
  const missingRes = await simulateRequest(app, 'GET', '/api/nonexistent-route');
  assert(missingRes.statusCode === 404, 'Unregistered route returns 404 Not Found');

  console.log('\n========================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

