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

export const syncSheetIdToFirestore = async (uid: string, sheetId: string) => {
  try {
    await setDoc(doc(db, 'users', uid), { sheetId }, { merge: true });
  } catch (e) {
    console.error("Failed to sync sheetId to Firestore", e);
  }
};

export const fetchSheetIdFromFirestore = async (uid: string): Promise<string | null> => {
  try {
    const docRef = await getDoc(doc(db, 'users', uid));
    if (docRef.exists()) {
      return docRef.data().sheetId;
    }
  } catch (e) {
    console.error("Failed to fetch sheetId from Firestore", e);
  }
  return null;
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
        // Upon auth success, check if we need to restore sheetId from firestore
        const existingAppSheetId = localStorage.getItem('my_sheet_id');
        let firestoreSheetId: string | null = null;
        try {
          firestoreSheetId = await fetchSheetIdFromFirestore(user.uid);
        } catch (e) {
          console.error("fetchSheetId failed", e);
        }
        
        if (firestoreSheetId && firestoreSheetId !== existingAppSheetId) {
          localStorage.setItem('my_sheet_id', firestoreSheetId);
        } else if (existingAppSheetId && !firestoreSheetId) {
          // If we have one locally but not in firestore, sync it up
          await syncSheetIdToFirestore(user.uid, existingAppSheetId).catch(console.error);
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
