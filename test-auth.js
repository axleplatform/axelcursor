// Test script to verify authentication flow
const { createClient } = require('@supabase/supabase-js');

// Test Supabase client creation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase client creation...');
console.log('🔍 Supabase URL:', supabaseUrl ? 'Present' : 'Missing');
console.log('🔍 Supabase Anon Key:', supabaseAnonKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ Supabase client created successfully');

// Test session retrieval
async function testSession() {
  try {
    console.log('🔍 Testing session retrieval...');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Error getting session:', error);
      return;
    }
    
    if (session) {
      console.log('✅ Session found');
      console.log('🔐 Access token length:', session.access_token?.length || 0);
      console.log('🔐 Refresh token length:', session.refresh_token?.length || 0);
      console.log('🔐 User ID:', session.user?.id);
      
      // Decode token
      try {
        const tokenParts = session.access_token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log('🔐 Token expiry:', new Date(payload.exp * 1000).toISOString());
          console.log('🔐 Token issued at:', new Date(payload.iat * 1000).toISOString());
          console.log('🔐 Token subject:', payload.sub);
          console.log('🔐 Token expired:', Date.now() > payload.exp * 1000);
        }
      } catch (e) {
        console.log('🔐 Could not decode token:', e.message);
      }
    } else {
      console.log('⚠️ No session found');
    }
  } catch (error) {
    console.error('❌ Error in test session:', error);
  }
}

// Test user retrieval
async function testUser() {
  try {
    console.log('🔍 Testing user retrieval...');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Error getting user:', error);
      return;
    }
    
    if (user) {
      console.log('✅ User found:', user.id);
      console.log('📧 User email:', user.email);
      console.log('🔐 User metadata:', user.user_metadata);
    } else {
      console.log('⚠️ No user found');
    }
  } catch (error) {
    console.error('❌ Error in test user:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting authentication tests...\n');
  
  await testSession();
  console.log('');
  
  await testUser();
  console.log('');
  
  console.log('✅ Tests completed');
}

runTests().catch(console.error); 