var admin = require("firebase-admin");
require('dotenv').config(); //loads any file in .env into an environmental variable

//console.log(process.env)

//var serviceAccount = require("./doggobase-development-6ff8f0a63a66.json");

var serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
module.exports = { admin, db }; 

