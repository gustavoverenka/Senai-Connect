const supabase = require('./src/config/supabase');

async function test() {
  const { data, error} =  await supabase
    .from('follows')
    .insert([{ follower_id: 1, following_id: 2 }]);
    
  console.log('Error:', error);
}

test();
