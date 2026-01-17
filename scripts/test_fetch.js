
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ylyqmjyxkjrqsbqwrras.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlseXFtanl4a2pycXNicXdycmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Nzg5MjAsImV4cCI6MjA4NDE1NDkyMH0.3DzsbcvZAjuljALzxw26sjmz67cxizlcjMTfUEFlBw4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFetch() {
  console.log('Testing fetch...')
  const groupId = 'ebe4f1d2-2774-44de-a811-263b303d6b66'
  
  const { data, error } = await supabase
    .from('members')
    .select('display_name, avatar_seed')
    .eq('group_id', groupId)
    .is('avatar_seed', null)
    .limit(5)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Data:', data)
  }
}

testFetch()
