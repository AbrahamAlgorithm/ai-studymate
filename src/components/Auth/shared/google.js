import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../../../firebase'

const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account' })

/** Signs in with a Google popup. Resolves to null if the user closed the popup. */
export const signInWithGoogle = async () => {
    try {
        return await signInWithPopup(auth, provider)
    } catch (error) {
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            return null
        }
        throw error
    }
}

export const getGoogleError = (code) => {
    switch (code) {
        case 'auth/popup-blocked':
            return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.'
        case 'auth/account-exists-with-different-credential':
            return 'An account already exists with this email. Sign in with your password instead.'
        case 'auth/unauthorized-domain':
        case 'auth/operation-not-allowed':
            return 'Google sign-in isn\'t available on this site yet. Please use email and password.'
        case 'auth/network-request-failed':
            return 'Network error. Check your connection and try again.'
        default:
            return 'Could not sign in with Google. Please try again.'
    }
}
