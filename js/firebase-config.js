/**
 * Firebase Configuration
 */

const firebaseConfig = {
    apiKey: "AIzaSyBw6dQb4kvXRkx6RnPIXTcU4yyXVhOyoag",
    authDomain: "black-box-21e9c.firebaseapp.com",
    databaseURL: "https://black-box-21e9c-default-rtdb.firebaseio.com",
    projectId: "black-box-21e9c",
    storageBucket: "black-box-21e9c.appspot.com",
    messagingSenderId: "955481792397",
    appId: "1:955481792397:web:635cf6cfd7128a8804a7c4",
    measurementId: "G-EGV23KNR55"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firebase services
const db = firebase.firestore();
const rtdb = firebase.database();

console.log('Firebase initialized');
