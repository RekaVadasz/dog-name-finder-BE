const firebase = require('firebase');

const firebaseConfig = {
    apiKey: "AIzaSyAM5RFod-GsdtIKTKfggjhChx0v7g6gCvM",
    authDomain: "doggobase-development.firebaseapp.com",
    projectId: "doggobase-development",
    storageBucket: "doggobase-development.appspot.com",
    messagingSenderId: "457785676820",
    appId: "1:457785676820:web:b8d2aaa720fe07130b8301"
};

firebase.initializeApp(firebaseConfig); 
module.exports = { firebase }; 