const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

//verifica se a url e key do supabase estao configuradas
if(!supabaseUrl || !supabaseKey) {
    console.error('Erro: SUPABASE_URL ou SUPABASE_KEY nao configurados no .env!')
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;