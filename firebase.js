const firebase = require('firebase');

// Import the functions you need from the SDKs you need
//import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAM5RFod-GsdtIKTKfggjhChx0v7g6gCvM",
  authDomain: "doggobase-development.firebaseapp.com",
  projectId: "doggobase-development",
  storageBucket: "doggobase-development.appspot.com",
  messagingSenderId: "457785676820",
  appId: "1:457785676820:web:b8d2aaa720fe07130b8301"
};

// Initialize Firebase --- ez kell???
//const app = initializeApp(firebaseConfig);

firebase.initializeApp(firebaseConfig); //initialize firebase app 
module.exports = { firebase }; //export the app