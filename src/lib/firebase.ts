import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// @ts-ignore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const syncSheetIdToFirestore = async (uid: string, sheetId: string, sheetName?: string) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data() : {};
    
    // Manage stores array
    const stores = data.stores || [];
    const nameToSave = sheetName || localStorage.getItem('bizName') || 'দোকান';
    
    // Check if sheetId already exists in stores
    const storeIndex = stores.findIndex((s: any) => s.id === sheetId);
    if (storeIndex === -1) {
      stores.push({ id: sheetId, name: nameToSave });
    } else {
      if (sheetName) stores[storeIndex].name = sheetName;
    }

    await setDoc(docRef, { sheetId, stores }, { merge: true });
  } catch (e) {
    console.error("Failed to sync sheetId to Firestore", e);
  }
};

export const fetchSheetIdFromFirestore = async (uid: string): Promise<string | null> => {
  try {
    const fetchPromise = (async () => {
      const docRef = await getDoc(doc(db, 'users', uid));
      if (docRef.exists() && docRef.data()?.sheetId) {
        return docRef.data().sheetId;
      }
      return null;
    })();

    // 5-second timeout
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (e) {
    console.error("Failed to fetch sheetId from Firestore", e);
  }
  return null;
};

export interface StoreDef {
  id: string;
  name: string;
}

export const fetchStoresFromFirestore = async (uid: string): Promise<StoreDef[]> => {
  try {
    const docRef = await getDoc(doc(db, 'users', uid));
    if (docRef.exists() && docRef.data()?.stores) {
      return docRef.data().stores;
    }
  } catch(e) {
    console.error(e);
  }
  return [];
};

export const updateCurrentSheetIdInFirestore = async (sheetId: string) => {
  const user = auth.currentUser;
  if (user) {
    await syncSheetIdToFirestore(user.uid, sheetId);
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    try {
      const lsToken = localStorage.getItem('google_sheets_token');
      
      if (user) {
        let existingAppSheetId = localStorage.getItem('my_sheet_id');
        const lastUid = localStorage.getItem('last_google_uid');
        if (lastUid && lastUid !== user.uid) {
          // Account switched, don't trust existing local data
          localStorage.removeItem('my_sheet_id');
          localStorage.removeItem('bizName');
          localStorage.removeItem('bizAddress');
          localStorage.removeItem('bizMobile');
          localStorage.removeItem('bizLogo');
          localStorage.removeItem('appUsers');
          existingAppSheetId = null;
        }
        localStorage.setItem('last_google_uid', user.uid);

        // Wait for Firestore operations
        try {
          let firestoreSheetId: string | null = null;
          try {
            firestoreSheetId = await fetchSheetIdFromFirestore(user.uid);
          } catch (e) {
            console.error("fetchSheetId failed", e);
          }
          
          if (firestoreSheetId && firestoreSheetId !== existingAppSheetId) {
            localStorage.setItem('my_sheet_id', firestoreSheetId);
          } else if (existingAppSheetId && !firestoreSheetId) {
            await syncSheetIdToFirestore(user.uid, existingAppSheetId).catch(console.error);
          }
        } catch (e) {
          console.error("Async firestore sync failed", e);
        }

        if (cachedAccessToken || lsToken) {
          if (!cachedAccessToken) cachedAccessToken = lsToken;
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken!);
        } else if (!isSigningIn) {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      } else {
        cachedAccessToken = null;
        localStorage.removeItem('google_sheets_token');
        if (onAuthFailure) onAuthFailure();
      }
    } catch (err) {
      console.error("Error inside onAuthStateChanged", err);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    const lastUid = localStorage.getItem('last_google_uid');
    if (lastUid && lastUid !== result.user.uid) {
      // Switched google accounts! Clear old data.
      localStorage.removeItem('my_sheet_id');
      localStorage.removeItem('bizName');
      localStorage.removeItem('bizAddress');
      localStorage.removeItem('bizMobile');
      localStorage.removeItem('bizLogo');
      localStorage.removeItem('appUsers');
      // DO NOT clear businessName, it's used for splash screen. 
    }
    localStorage.setItem('last_google_uid', result.user.uid);

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('google_sheets_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  const lsToken = localStorage.getItem('google_sheets_token');
  if (lsToken) {
    cachedAccessToken = lsToken;
    return cachedAccessToken;
  }
  return null;
};

export const clearGoogleAuth = async () => {
  cachedAccessToken = null;
  localStorage.removeItem('google_sheets_token');
  await auth.signOut().catch(() => {});
};
