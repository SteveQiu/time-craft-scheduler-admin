#!/usr/bin/env node

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dbabjfydcllqbjpolhym.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPasswordReset() {
  try {
    console.log('🔐 Testing Password Reset Settings Feature\n');

    // Test email and password
    const testEmail = 'test-pwd-reset@example.com';
    const originalPassword = 'TestPassword123!';
    const newPassword = 'NewPassword456!';

    console.log(`📧 Creating test account: ${testEmail}`);
    
    // Sign up new user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: originalPassword,
    });

    if (signUpError) throw signUpError;
    
    const userId = authData.user?.id;
    console.log(`✅ User created: ${userId}`);

    // Sign in to get session
    console.log('\n🔑 Signing in with original password...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: originalPassword,
    });

    if (signInError) throw signInError;
    console.log('✅ Signed in successfully');

    // Attempt to change password
    console.log('\n🔄 Attempting to change password...');
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) throw updateError;
    console.log('✅ Password updated');

    // Sign out and try signing in with new password
    console.log('\n🚪 Signing out...');
    await supabase.auth.signOut();

    console.log('\n🔑 Attempting to sign in with new password...');
    const { data: newSignIn, error: newSignInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: newPassword,
    });

    if (newSignInError) throw newSignInError;
    console.log('✅ Successfully signed in with new password');

    // Verify old password no longer works
    console.log('\n❌ Verifying old password no longer works...');
    const { error: oldPasswordError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: originalPassword,
    });

    if (oldPasswordError && oldPasswordError.message.includes('Invalid login credentials')) {
      console.log('✅ Old password correctly rejected');
    } else {
      throw new Error('Old password should be rejected!');
    }

    console.log('\n✅ Password reset Settings feature test PASSED!\n');

  } catch (error) {
    console.error('❌ Test FAILED:', error.message);
    process.exit(1);
  }
}

testPasswordReset();
