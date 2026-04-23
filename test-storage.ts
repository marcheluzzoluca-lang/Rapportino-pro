import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: 'gen-lang-client-0594587787.appspot.com'
});

async function test() {
  const bucket = admin.storage().bucket();
  const file = bucket.file('test.txt');
  await file.save('hello world');
  const [content] = await file.download();
  console.log(content.toString());
}
test().catch(console.error);
