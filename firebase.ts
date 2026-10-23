import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc, 
  deleteDoc,
  arrayUnion,
  arrayRemove,
  limit,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyDN-FKNNgPasrz0Y0Bb2ZIC11Uy2XdCOI0",
  authDomain: "w10mmesseger.firebaseapp.com",
  projectId: "w10mmesseger",
  storageBucket: "w10mmesseger.firebasestorage.app",
  messagingSenderId: "30538271716",
  appId: "1:30538271716:web:6ecc42b8061edfee5955f1",
  measurementId: "G-F3WLQ8YW35"
};

export const IMGBB_API_KEY = "55d98bafba3880bb920a9b9cec7b5545";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithRedirect,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  limit,
  orderBy,
  Timestamp,
  ref,
  uploadBytesResumable,
  getDownloadURL
};
export type { User };
