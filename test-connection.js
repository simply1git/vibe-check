const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ylyqmjyxkjrqsbqwrras.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlseXFtanl4a2pycXNicXdycmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Nzg5MjAsImV4cCI6MjA4NDE1NDkyMH0.3DzsbcvZAjuljALzxw26sjmz67cxizlcjMTfUEFlBw4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing connection...');
  
  // Try to fetch all groups
  const { data: groups, error } = await supabase
    .from('groups')
    .select('id, name, slug, access_code');

  if (error) {
    console.error('Error fetching groups:', error);
  } else {
    console.log('Groups found:', groups);
  }
}

test();
