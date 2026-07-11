console.log(JSON.stringify({
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  FIREBASE_CONFIG: process.env.FIREBASE_CONFIG,
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
}, null, 2));
