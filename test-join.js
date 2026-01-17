const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ylyqmjyxkjrqsbqwrras.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlseXFtanl4a2pycXNicXdycmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Nzg5MjAsImV4cCI6MjA4NDE1NDkyMH0.3DzsbcvZAjuljALzxw26sjmz67cxizlcjMTfUEFlBw4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugSas() {
  console.log('--- Debugging SAS ---');
  
  // 1. Fetch ALL and filter manually
  const { data: allGroups } = await supabase.from('groups').select('slug, name');
  const sasGroup = allGroups.find(g => g.slug === 'sas');
  console.log('Manual find from all:', sasGroup);
  
  if (sasGroup) {
      console.log(`Slug length: ${sasGroup.slug.length}`);
      console.log(`Slug chars: ${sasGroup.slug.split('').map(c => c.charCodeAt(0))}`);
  }

  // 2. Query with EQ
  const { data: eqData, error: eqError } = await supabase
    .from('groups')
    .select('slug, name')
    .eq('slug', 'sas');
    
  console.log('EQ Query result:', eqData);
  console.log('EQ Query error:', eqError);
}

debugSas();
