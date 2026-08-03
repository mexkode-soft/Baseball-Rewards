import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEMO_SPONSOR_EMAIL || 'sponsor.demo@homerunrewards.mx';
const password = process.env.DEMO_SPONSOR_PASSWORD || 'HomeRunSponsor2026!';
if (!url || !serviceRole) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const supabase = createClient(url, serviceRole, { auth: { autoRefreshToken:false, persistSession:false } });
let user;
const created = await supabase.auth.admin.createUser({ email, password, email_confirm:true, user_metadata:{ full_name:'Patrocinador Demo' } });
if (created.error) {
  const listed = await supabase.auth.admin.listUsers({ page:1, perPage:1000 });
  user = listed.data?.users?.find((item)=>item.email===email);
  if (!user) throw created.error;
  await supabase.auth.admin.updateUserById(user.id,{ password, email_confirm:true });
} else user = created.data.user;
const { error: profileError } = await supabase.from('profiles').upsert({ id:user.id,email,full_name:'Patrocinador Demo',role:'sponsor' });
if (profileError) throw profileError;
const { data:org,error:orgError } = await supabase.from('sponsor_organizations').select('id').eq('slug','marca-demo-home-run').single();
if (orgError) throw orgError;
const { error:memberError } = await supabase.from('sponsor_members').upsert({ organization_id:org.id,user_id:user.id,member_role:'owner' });
if (memberError) throw memberError;
console.log('\nUsuario patrocinador listo:');
console.log(`Correo: ${email}`);
console.log(`Contraseña: ${password}`);
