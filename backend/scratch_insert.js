const supabase = require('./src/config/supabase');

async function test() {
  const { data, error} =  await supabase
    .from('messages')
    .insert([{ sender_id: 1, receiver_id: 2, content: 'test msg' }])
    .select();
    
  console.log('Error:', error);
  console.log('Data:', data);
}

test();
