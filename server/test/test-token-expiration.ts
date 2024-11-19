import { TokenService } from "../src/middleware/lnap/TokenService";
import type { TokenMetadata } from "../src/middleware/lnap/types";

async function testTokenExpiration() {
  console.log('\n🔍 Running detailed token expiration tests...');
  
  const hmacSecret = 'test-secret';
  const tokenService = new TokenService(hmacSecret);
  
  // Test Case 1: Short expiration (6 seconds)
  console.log('\nTest Case 1: Short expiration token (6s)');
  const now = Math.floor(Date.now() / 1000);
  const shortExpirationMeta: TokenMetadata = {
    amountPaid: 1000,
    issuedAt: now,
    expiresAt: now + 6,
    paymentHash: 'test-hash'
  };
  
  const shortToken = tokenService.generateToken(shortExpirationMeta);
  console.log('Token generated with 6 second expiration');
  
  // Verify immediately
  let isValid = tokenService.verifyToken(shortToken);
  console.log('Initial verification:', isValid);
  if (!isValid) {
    throw new Error('Token should be valid immediately after creation');
  }
  
  // Wait 3 seconds and verify (should still be valid)
  console.log('Waiting 3 seconds...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  isValid = tokenService.verifyToken(shortToken);
  console.log('Mid-lifetime verification:', isValid);
  if (!isValid) {
    throw new Error('Token should still be valid at 3 seconds');
  }
  
  // Wait 4 more seconds (total 7s) and verify (should be expired)
  console.log('Waiting 4 more seconds...');
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  isValid = tokenService.verifyToken(shortToken);
  console.log('After expiration verification:', isValid);
  if (isValid) {
    throw new Error('Token should have expired after 7 seconds');
  }
  
  // Test Case 2: Multiple durations
  console.log('\nTest Case 2: Multiple duration tokens');
  const testDurations = [3, 6, 9]; // seconds
  const tokens = testDurations.map(duration => {
    const testNow = Math.floor(Date.now() / 1000);
    return {
      duration,
      token: tokenService.generateToken({
        amountPaid: 1000,
        issuedAt: testNow,
        expiresAt: testNow + duration,
        paymentHash: `test-hash-${duration}`
      })
    };
  });
  
  // Initial verification
  console.log('Verifying all tokens initially...');
  for (const { duration, token } of tokens) {
    const valid = tokenService.verifyToken(token);
    console.log(`Token with ${duration}s duration initially valid:`, valid);
    if (!valid) {
      throw new Error(`${duration}s token should be valid initially`);
    }
  }
  
  // Wait 4 seconds
  console.log('Waiting 4 seconds...');
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  // Verify all tokens
  console.log('Verifying all tokens after 4 seconds...');
  for (const { duration, token } of tokens) {
    const valid = tokenService.verifyToken(token);
    console.log(`Token with ${duration}s duration valid after 4s:`, valid);
    
    if (duration <= 3 && valid) {
      throw new Error(`${duration}s token should have expired`);
    }
    if (duration > 4 && !valid) {
      throw new Error(`${duration}s token should still be valid`);
    }
  }
}

// Run the test
console.log('Starting token expiration tests...');
testTokenExpiration()
  .then(() => {
    console.log('\n✅ Token expiration tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Token expiration tests failed:', error);
    process.exit(1);
  });