import { authenticatedLndGrpc, payViaPaymentRequest } from "lightning";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

function hexToBase64(hexString: string): string {
  return Buffer.from(hexString, 'hex').toString('base64');
}

function base64ToHex(base64String: string): string {
  return Buffer.from(base64String, 'base64').toString('hex');
}

// Moved sleep function outside to avoid redefinition
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testLNAP() {
  try {
    // Validate environment variables
    if (!process.env.TEST_LND_SOCKET || !process.env.TEST_LND_MACAROON || !process.env.TEST_LND_CERT) {
      throw new Error('Missing required environment variables for LND connection');
    }

    const { lnd } = await authenticatedLndGrpc({
      socket: process.env.TEST_LND_SOCKET,
      macaroon: process.env.TEST_LND_MACAROON,
      cert: process.env.TEST_LND_CERT,
    });

    const baseURL = 'http://localhost:3000';
    const api = axios.create({ 
      baseURL,
      timeout: 5000 // Add timeout for requests
    });

    console.log('🚀 Starting LNAP test flow...');

    // Step 1: Get invoice
    console.log("\n1. Requesting invoice...");
    const invoiceResponse = await api.get("/auth/init");
    const { paymentHash, invoice } = invoiceResponse.data;
    const paymentHashHex = base64ToHex(paymentHash);

    console.log("Invoice received:", invoice);
    console.log("Payment hash (base64):", paymentHash);
    console.log("Payment hash (hex):", paymentHashHex);

    // Step 2: Pay invoice
    console.log("\n2. Paying invoice...");
    const paymentResult = await payViaPaymentRequest({ lnd, request: invoice });
    
    if (!paymentResult.secret) {
      throw new Error("Payment failed - no preimage received");
    }

    const preimageBase64 = hexToBase64(paymentResult.secret);
    
    console.log("Payment successful!");
    console.log("Debug info:", {
      preimageHex: paymentResult.secret,
      preimageBase64,
      receivedHash: paymentHash,
      receivedHashHex: paymentHashHex,
    });

    // Wait for payment to be processed
    await sleep(2000); // Increased to 2 seconds for better reliability

    // Step 3: Verify payment
    console.log("\n3. Verifying payment...");
    const verificationResponse = await api.post("/auth/verify", {
      paymentHash,
      paymentPreimage: preimageBase64,
    });

    const { token } = verificationResponse.data;
    console.log("Token received:", token);

    // Step 4: Test protected route
    console.log("\n4. Testing protected route...");
    const protectedResponse = await api.get("/api/protected", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Protected route response:", protectedResponse.data);
    console.log("\n✅ All tests completed successfully!");

  } catch (error: any) {
    console.error("\n❌ Test failed:", error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error("Error details:", {
        data: error.response.data,
        status: error.response.status,
        statusText: error.response.statusText
      });
    }

    process.exit(1);
  }
}

// Run the test
console.log("Starting LNAP integration test...");
testLNAP().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});