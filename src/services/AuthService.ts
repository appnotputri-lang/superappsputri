import { 
  auth, 
  db, 
  loginWithGoogle as firebaseLoginWithGoogle, 
  logout as firebaseLogout,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../../types';

export class AuthService {
  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  static async loginWithGoogle(): Promise<FirebaseUser> {
    return await firebaseLoginWithGoogle();
  }

  static async logout(): Promise<void> {
    await firebaseLogout();
  }

  static observeAuthState(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  static observeUserProfile(
    uid: string,
    email: string | null,
    displayName: string | null,
    onUpdate: (profile: UserProfile | null) => void,
    onError?: (err: any) => void
  ): () => void {
    const docRef = doc(db, 'user_profiles', uid);
    return onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Ensure Super Admin logic for specific email
        if (email === 'appnotputri@gmail.com' && data.role !== 'Super Admin') {
          try {
            await updateDoc(docRef, { role: 'Super Admin' });
          } catch (err) {
            console.error("Gagal memperbarui peran Super Admin:", err);
          }
          return;
        }
        onUpdate({
          ...data,
          uid,
          email: email || '',
        } as UserProfile);
      } else {
        // Initial profile creation
        const isSuperAdmin = email === 'appnotputri@gmail.com';
        const initialProfile: UserProfile = {
          uid,
          email: email || '',
          name: displayName || 'User',
          role: isSuperAdmin ? 'Super Admin' : 'Staff',
          level: isSuperAdmin ? 'Super Admin' : 'Staff',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await setDoc(docRef, initialProfile);
          onUpdate(initialProfile);
        } catch (err) {
          console.error("Gagal membuat profil pengguna baru:", err);
          if (onError) onError(err);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `user_profiles/${uid}`);
      if (onError) onError(error);
    });
  }
}
