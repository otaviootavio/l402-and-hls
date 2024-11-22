import { authenticatedLndGrpc, getWalletInfo, createInvoice } from "lightning";
import dotenv from "dotenv";

dotenv.config();

async function testLndConnection() {
  try {
    console.log('🚀 Starting LND connection test...');
    console.log('Checking environment variables...');

    // Verify environment variables
    if (!process.env.LND_SOCKET) {
      throw new Error('Missing LND_SOCKET environment variable');
    }
    if (!process.env.LND_MACAROON) {
      throw new Error('Missing LND_MACAROON environment variable');
    }
    if (!process.env.LND_CERT) {
      throw new Error('Missing LND_CERT environment variable');
    }

    console.log('Environment variables present ✓');
    console.log('\nAttempting to connect to LND node...');

    // Attempt to authenticate with LND
    const { lnd } = await authenticatedLndGrpc({
      socket: process.env.LND_SOCKET,
      macaroon: process.env.LND_MACAROON,
      cert: process.env.LND_CERT,
    });

    console.log('Authentication successful ✓');
    console.log('\nFetching node information...');

    // Get node information
    const info = await getWalletInfo({ lnd });
    
    console.log('\n📊 LND Node Information:');
    console.log('------------------------');
    console.log('Public Key:', info.public_key);
    console.log('Alias:', info.alias);
    console.log('Version:', info.version);
    console.log('Chain Sync:', info.is_synced_to_chain ? '✅ Synced' : '❌ Not Synced');
    console.log('Graph Sync:', info.is_synced_to_graph ? '✅ Synced' : '❌ Not Synced');
    console.log('Active Channels:', info.active_channels_count);
    console.log('Pending Channels:', info.pending_channels_count);
    console.log('Chain Height:', info.current_block_height);
    console.log('------------------------');

    // Test invoice creation
    console.log('\n📝 Testing invoice creation...');
    const testInvoice = await createInvoice({ 
      lnd,
      tokens: 1000, // 1000 sats
      description: 'Test Invoice',
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour expiry
    });

    console.log('\n🧾 Invoice Details:');
    console.log('------------------------');
    console.log('Invoice:', testInvoice.request);
    console.log('Hash:', testInvoice.id);
    console.log('Description:', 'Test Invoice');
    console.log('Amount:', '1000 sats');
    console.log('------------------------');

    console.log('\n✅ LND connection and invoice creation tests completed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error details:', error);
    } else {
      console.error('Unknown error:', error);
    }
    return false;
  }
}

// Run the tests
console.log("Starting LND connection and invoice creation tests...");
testLndConnection().then((success) => {
  if (!success) {
    process.exit(1);
  }
});