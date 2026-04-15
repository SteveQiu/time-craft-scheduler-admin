#!/usr/bin/env node

/**
 * Query actual Supabase schema and compare against specification
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://dbabjfydcllqbjpolhym.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYWJqZnlkY2xscWJqcG9saHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzk1OTYsImV4cCI6MjA2ODYxNTU5Nn0.SyYn3n9-sA9A2gwoIgY06oHHRg8Lfw1p3XNjV7Dadys';

// Read credentials
const secretFile = path.join(__dirname, '.secret');
const secretContent = fs.readFileSync(secretFile, 'utf-8');
const secrets = {};
secretContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    secrets[key.trim()] = value.trim();
  }
});

const ADMIN_KEY = secrets.SUPABASE_KEY;

console.log('🔍 Supabase Schema Audit');
console.log('========================\n');

// Query with admin key to see more details
async function query(sql) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/execute_raw_sql`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': ADMIN_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql })
    });
    
    if (!response.ok) {
      console.log(`Error: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    // Fall back to direct queries
    return null;
  }
}

// Get tables
async function getTables() {
  console.log('📋 STEP 1: List tables');
  console.log('---');
  
  const url = `${SUPABASE_URL}/rest/v1/information_schema.tables?table_schema=eq.public&select=table_name`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      console.log(`Found ${data.length} tables:`);
      data.forEach(t => console.log(`  - ${t.table_name}`));
      return data.map(t => t.table_name);
    } else {
      console.log('Could not list tables');
      return [];
    }
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}

// Get columns for a table
async function getColumns(tableName) {
  const url = `${SUPABASE_URL}/rest/v1/information_schema.columns?table_schema=eq.public&table_name=eq.${tableName}&select=column_name,data_type,is_nullable,column_default&order=ordinal_position`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

// Check FKs
async function getForeignKeys() {
  console.log('\n🔗 STEP 3: Foreign key constraints');
  console.log('---');
  
  const url = `${SUPABASE_URL}/rest/v1/information_schema.key_column_usage?table_schema=eq.public&referenced_table_name=not.is.null&select=constraint_name,table_name,column_name,referenced_table_name,referenced_column_name`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      console.log(`Found ${data.length} foreign key constraints:`);
      data.forEach(fk => {
        console.log(`  ${fk.table_name}.${fk.column_name} → ${fk.referenced_table_name}.${fk.referenced_column_name}`);
      });
    } else {
      console.log('⚠️  No foreign keys found!');
    }
    
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}

// Check row security
async function getRowSecurity() {
  console.log('\n🔐 STEP 4: Row-level security');
  console.log('---');
  
  const url = `${SUPABASE_URL}/rest/v1/pg_tables?schemaname=eq.public&select=tablename,rowsecurity`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      console.log(`RLS status for ${data.length} tables:`);
      data.forEach(t => {
        const status = t.rowsecurity ? '✅ ENABLED' : '❌ DISABLED';
        console.log(`  ${t.tablename}: ${status}`);
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}

// Main audit
(async () => {
  try {
    const tables = await getTables();
    
    console.log('\n📊 STEP 2: Table structures');
    console.log('---');
    for (const table of tables) {
      const columns = await getColumns(table);
      console.log(`\n${table}: ${columns.length} columns`);
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` = ${col.column_default}` : '';
        console.log(`  ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      });
    }
    
    await getForeignKeys();
    await getRowSecurity();
    
    // Test query
    console.log('\n📈 STEP 5: Data counts');
    console.log('---');
    
    for (const table of ['profiles', 'openings', 'appointments', 'service_workers', 'org_invites']) {
      if (tables.includes(table)) {
        const url = `${SUPABASE_URL}/rest/v1/${table}?limit=1`;
        const response = await fetch(url, {
          headers: {
            'apikey': ANON_KEY,
            'Content-Type': 'application/json',
          }
        });
        if (response.ok) {
          const rangeHeader = response.headers.get('content-range');
          console.log(`  ${table}: ${rangeHeader || 'unknown'}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
