import { getGoogleAccessToken } from '../src/lib/google-auth';

async function getAbout() {
  const token = await getGoogleAccessToken();
  const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await response.json() as any;
  console.log('Google Account details:', JSON.stringify(data, null, 2));
}

getAbout().catch(console.error);
