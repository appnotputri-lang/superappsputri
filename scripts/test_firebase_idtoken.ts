import fs from 'fs';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

if (!getApps().length) {
  initializeApp({
    projectId: config.projectId
  });
}

async function testToken() {
  console.log("1. Generating custom token via firebase-admin...");
  const auth = getAuth();
  const customToken = await auth.createCustomToken("admin-migration-uid", {
    email: "appnotputri@gmail.com"
  });
  console.log("✓ Custom token generated successfully!");

  console.log("\n2. Exchanging custom token for ID token via Identity Toolkit API...");
  const apiKey = config.apiKey;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: customToken,
      returnSecureToken: true
    })
  });

  const data: any = await res.json();
  if (data.idToken) {
    console.log("✓ Successfully exchanged custom token for Firebase ID Token!");
    console.log("ID Token sample:", data.idToken.slice(0, 30) + "...");
    return data.idToken;
  } else {
    console.error("ERROR Exchanging custom token:", data);
    process.exit(1);
  }
}

testToken().catch(console.error);
