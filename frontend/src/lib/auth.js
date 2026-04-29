import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function checkStaffAccess(uid) {
  const staffDoc = await getDoc(doc(db, 'staff', uid))
  return staffDoc.exists()
}

export async function signOutStaff() {
  await signOut(auth)
}
