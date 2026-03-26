import { createClient } from '@insforge/sdk';

const client = createClient({
  baseUrl: 'https://vaj84xbk.us-east.insforge.app',
  anonKey: 'ik_032e109a0b87738d97c32b59fe49afd2'
});

async function testLogin() {
  console.log('Testando login para wellington.mucuri@gmail.com...');
  const { data, error } = await client.auth.signInWithPassword({
    email: 'wellington.mucuri@gmail.com',
    password: '123456'
  });

  if (error) {
    console.error('Erro no login:', error.message);
  } else {
    console.log('Login bem-sucedido!', data.user.id);
  }
}

testLogin();
