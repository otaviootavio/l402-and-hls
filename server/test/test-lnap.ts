import { authenticatedLndGrpc, payViaPaymentRequest, getWalletInfo } from "lightning";
import express from "express";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { LightningService } from "../src/middleware/lnap/LightningService";
import { TokenService } from "../src/middleware/lnap/TokenService";
import { LNAPMiddleware } from "../src/middleware/lnap";
import type { LNAPConfig } from "../src/middleware/lnap/types";

dotenv.config();

function hexToBase64(hexString: string): string {
  return Buffer.from(hexString, 'hex').toString('base64');
}

function base64ToHex(base64String: string): string {
  return Buffer.from(base64String, 'base64').toString('hex');
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkLndConnection(lnd: any) {
  try {
    const info = await getWalletInfo({ lnd });
    console.log('LND connection check:', {
      pubkey: info.public_key,
      isSync: info.is_synced_to_chain,
      version: info.version,
      activeChannels: info.active_channels_count,
    });
    return true;
  } catch (error) {
    console.error('LND connection check failed:', error);
    return false;
  }
}

async function retryPayment(lnd: any, invoice: string, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Payment attempt ${attempt}/${maxAttempts}...`);
      const result = await payViaPaymentRequest({ lnd, request: invoice });
      return result;
    } catch (error: any) {
      console.log(`Payment attempt ${attempt} failed:`, error.message);
      if (attempt === maxAttempts) throw error;
      await sleep(2000); // Wait 2 seconds between attempts
    }
  }
}

async function setupTestServer() {
  try {
    if (!process.env.TEST_LND_SOCKET || !process.env.TEST_LND_MACAROON || !process.env.TEST_LND_CERT) {
      throw new Error('Missing required environment variables for LND connection');
    }

    const { lnd } = await authenticatedLndGrpc({
      socket: process.env.TEST_LND_SOCKET,
      macaroon: process.env.TEST_LND_MACAROON,
      cert: process.env.TEST_LND_CERT,
    });

    // Check LND connection first
    const isConnected = await checkLndConnection(lnd);
    if (!isConnected) {
      throw new Error('Failed to connect to LND or LND is not ready');
    }

    const testConfig: LNAPConfig = {
      invoiceExpiryMinutes: 2,
      tokenExpiryMinutes: 0.1,
      requiredPaymentAmount: 1000,
      hmacSecret: 'test-secret-key'
    };

    const lightningService = new LightningService(lnd);
    const tokenService = new TokenService(testConfig.hmacSecret);
    const lnap = new LNAPMiddleware(lightningService, tokenService, testConfig);

    const app = express();
    app.use(express.json());

    app.get("/auth/init", (req, res) => lnap.initAuth(req, res));
    app.post("/auth/verify", (req, res) => lnap.verifyAuth(req, res));
    app.get(
      "/api/protected",
      (req, res, next) => lnap.protect(req, res, next),
      (req, res) => {
        res.json({ message: "Access granted to protected resource" });
      }
    );

    const server = app.listen(3001);
    console.log('Test server started on port 3001');
    
    return {
      server,
      lnd,
      config: testConfig,
      baseURL: 'http://localhost:3001'
    };
  } catch (error) {
    console.error('Failed to setup test server:', error);
    throw error;
  }
}

async function testBasicFlow(api: any, lnd: any) {
  try {
    // Step 1: Get invoice
    console.log('\nStep 1: Requesting invoice...');
    const invoiceResponse = await api.get("/auth/init");
    const { paymentHash, invoice } = invoiceResponse.data;
    console.log('Invoice received:', { paymentHash, invoice });

    // Step 2: Pay invoice with retry logic
    console.log('\nStep 2: Paying invoice...');
    const paymentResult = await retryPayment(lnd, invoice);
    if (!paymentResult?.secret) {
      throw new Error("Payment failed - no preimage received");
    }
    const preimageBase64 = hexToBase64(paymentResult.secret);
    console.log('Payment successful:', { 
      preimageHex: paymentResult.secret, 
      preimageBase64,
      paymentHash: base64ToHex(paymentHash) // For comparison
    });

    await sleep(2000);

    // Step 3: Verify payment
    console.log('\nStep 3: Verifying payment...');
    const verificationResponse = await api.post("/auth/verify", {
      paymentHash,
      paymentPreimage: preimageBase64,
    });
    const { token, metadata } = verificationResponse.data;
    console.log('Payment verified:', { token, metadata });

    // Step 4: Test protected route
    console.log('\nStep 4: Testing protected route...');
    const protectedResponse = await api.get("/api/protected", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Protected route response:', protectedResponse.data);

    return { token, metadata };
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('API Error:', {
        endpoint: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      console.error('Payment Error:', error);
    }
    throw error;
  }
}

async function testTokenExpiry(api: any, token: string, config: LNAPConfig) {
  try {
    // First verify token works
    console.log('\nVerifying initial token validity...');
    const initialResponse = await api.get("/api/protected", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (initialResponse.status !== 200) {
      throw new Error(`Initial token verification failed: ${initialResponse.status}`);
    }
    console.log('Token initially valid');

    // Calculate wait time in milliseconds
    const waitMs = Math.ceil(config.tokenExpiryMinutes * 60 * 1000);
    console.log(`Waiting ${waitMs}ms for token to expire...`);
    await sleep(waitMs + 1000); // Add 1 second buffer

    // Try to use expired token
    console.log('Testing expired token...');
    const expiredResponse = await api.get("/api/protected", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      validateStatus: (status: number) => true, // Don't throw on any status
    });

    if (expiredResponse.status !== 401) {
      throw new Error(`Expected 401 status for expired token, got ${expiredResponse.status}`);
    }

    console.log('Token correctly expired with 401 status');
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('Token expiry test error:', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    throw error;
  }
}



async function runTests() {
  let server;
  try {
    console.log('🚀 Starting enhanced LNAP test suite...');
    const testSetup = await setupTestServer();
    server = testSetup.server;
    
    const api = axios.create({ 
      baseURL: testSetup.baseURL,
      timeout: 5000,
      validateStatus: status => status < 500, // Don't throw on 4xx errors
    });

    // Test 1: Basic Authentication Flow
    console.log('\n📋 Test 1: Basic Authentication Flow');
    const { token } = await testBasicFlow(api, testSetup.lnd);
    console.log('✅ Basic authentication flow successful');

    // Test 2: Token Expiry
    console.log('\n📋 Test 2: Token Expiry');
    await testTokenExpiry(api, token, testSetup.config);
    console.log('✅ Token expiry test successful');

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    if (error instanceof AxiosError) {
      console.error('API Error Details:', {
        endpoint: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  } finally {
    if (server) {
      server.close();
      console.log('\nTest server shut down');
    }
  }
}

// Run the tests
console.log("Starting enhanced LNAP integration test suite...");
runTests().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});