import { auth } from "./firebase";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    updatePassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    updateProfile,
} from "firebase/auth";

export const doCreateUserWithEmailAndPassword = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

export const doSignInWithEmailAndPassword = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const doSignInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider)
    const user = result.user;
    return result;
};

export const doSignOut = () => {
    return signOut(auth);
};

export const doPasswordReset = (email) => {
    return sendPasswordResetEmail(auth, email);
}

export const doPasswordChange = (password) => {
    return updatePassword(auth.currentUser, password);
};

export const doSendEmailVerification = () => {
    return sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/home`,
    });
};

/**
 * Get current user's Firebase ID token.
 * Used for authenticating with backend API.
 */
export const getIdToken = async (forceRefresh = false) => {
    if (!auth.currentUser) {
        throw new Error("No user logged in");
    }
    return auth.currentUser.getIdToken(forceRefresh);
};

/**
 * Get current user object.
 */
export const getCurrentUser = () => {
    return auth.currentUser;
};

/**
 * Subscribe to auth state changes.
 * Returns unsubscribe function.
 */
export const onAuthStateChange = (callback) => {
    return auth.onAuthStateChanged(callback);
};
export const doUpdateDisplayName = async (displayName) => {
    if (!auth.currentUser) throw new Error("No user logged in");
    await updateProfile(auth.currentUser, { displayName });
};
