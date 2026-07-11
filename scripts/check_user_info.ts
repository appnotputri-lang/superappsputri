import { getGoogleAccessToken } from '../src/lib/google-auth';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

async function checkUserInfo() {
  const token = await getGoogleAccessToken();
  const url = `${BASE_URL}/about?fields=user,storageQuota`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await response.json() as any;
  if (!response.ok) {
    console.error('Failed to get about info:', data);
    return;
  }

  console.log('Authorized User Info:');
  console.log(`- Name: ${data.user?.displayName}`);
  console.log(`- Email: ${data.user?.emailAddress}`);
  console.log(`- Me: ${data.user?.me}`);
}

checkUserInfo().catch(console.error);
