import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ayyrgbaepoxukybimlhx.supabase.co';
const supabaseKey = 'sb_publishable_eFYCmXXW90TB6VhoZXeWZQ_P3o0aPfC';

export const supabase = createClient(supabaseUrl, supabaseKey);