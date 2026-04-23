import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};

if (fs.existsSync(configPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else if (process.env.FIREBASE_CONFIG) {
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    console.log('[Firestore Sync] Using Firebase config from FIREBASE_CONFIG environment variable.');
  } catch (e) {
    console.error('[Firestore Sync] Failed to parse FIREBASE_CONFIG environment variable.');
  }
} else {
  console.warn('[Firestore Sync] firebase-applet-config.json not found and FIREBASE_CONFIG env var is missing!');
  // Fallback to individual env vars if available
  firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
    firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || '(default)'
  };
}

// Initialize Firebase Client
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

export async function downloadDbFromFirestore(dbPath: string) {
  try {
    console.log('[Firestore Sync] Checking for existing database backup...');
    const metadataRef = doc(firestore, 'sqlite_backup', 'metadata');
    const metadataDoc = await getDoc(metadataRef);
    
    if (!metadataDoc.exists()) {
      console.log('[Firestore Sync] No backup found in Firestore.');
      return false;
    }
    
    const chunksCount = metadataDoc.data()?.chunks || 0;
    console.log(`[Firestore Sync] Found backup with ${chunksCount} chunks. Downloading...`);
    
    let base64 = '';
    for (let i = 0; i < chunksCount; i++) {
      const chunkRef = doc(firestore, 'sqlite_backup', `chunk_${i}`);
      const chunkDoc = await getDoc(chunkRef);
      if (chunkDoc.exists()) {
        base64 += chunkDoc.data()?.data || '';
      }
    }
    
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(dbPath, buffer);
    console.log('[Firestore Sync] Database successfully restored from Firestore.');
    return true;
  } catch (error) {
    console.error('[Firestore Sync] Error downloading database:', error);
    return false;
  }
}

export async function uploadDbToFirestore(dbPath: string) {
  try {
    if (!fs.existsSync(dbPath)) return;
    
    console.log('[Firestore Sync] Uploading database backup to Firestore...');
    const buffer = fs.readFileSync(dbPath);
    const base64 = buffer.toString('base64');
    
    // Firestore document size limit is 1MB. We chunk at ~800KB to be safe.
    const chunkSize = 800000; 
    const chunks = [];
    for (let i = 0; i < base64.length; i += chunkSize) {
      chunks.push(base64.slice(i, i + chunkSize));
    }
    
    const batch = writeBatch(firestore);
    const metadataRef = doc(firestore, 'sqlite_backup', 'metadata');
    batch.set(metadataRef, { 
      chunks: chunks.length, 
      timestamp: serverTimestamp(),
      sizeBytes: buffer.length
    });
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkRef = doc(firestore, 'sqlite_backup', `chunk_${i}`);
      batch.set(chunkRef, { data: chunks[i] });
    }
    
    await batch.commit();
    console.log(`[Firestore Sync] Database backup uploaded successfully (${chunks.length} chunks).`);
  } catch (error) {
    console.error('[Firestore Sync] Error uploading database:', error);
  }
}

let syncTimeout: NodeJS.Timeout | null = null;

export function scheduleDbSync(dbPath: string) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    uploadDbToFirestore(dbPath);
    syncTimeout = null;
  }, 5000); // Sync 5 seconds after the last change
}
