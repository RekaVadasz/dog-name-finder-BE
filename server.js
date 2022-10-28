const express = require('express');
const app =express();
const fs = require('fs');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const { db } = require('./admin');
const bcrypt = require('bcrypt');
const cors = require('cors');

require('dotenv').config();

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());
app.use(express.static('../frontend'));
app.use(cors());

const port = 5000;

// - - - - Register new user in Firebase - - - - 

app.post('/register', async (req, res) => {
    const username = req.body.username;
    const plainTextPassword = req.body.password;

    const usersRef = db.collection('users');
    const newUser = usersRef.doc()
    const snapShot = await usersRef.where('username', '==', username).get(); 
    
    if (snapShot.empty) {
        bcrypt.hash(plainTextPassword, 10, (err, hash) => {
            const user = {
                'username': username,
                'password': hash, 
                'favs': [],
                'sent': []
            }
            newUser.set(user)
            res.send('new user registered')
        })
    } else {
        res.status(406).send('username already exists') //406 - Not Acceptable
    } 
})

// - - - - Login - - - - 

app.post('/login', async (req, res) => {
    const username = req.body.username;
    const plainTextPassword = req.body.password;
    const usersRef = db.collection('users');
    const snapShot = await usersRef.get();

    let userFound = false;

    if (!snapShot.empty) {
        snapShot.forEach(doc => {
            if (doc.data().username === username) {
                userFound = true;
                const correctPassword = bcrypt.compareSync(plainTextPassword, doc.data().password);
                if (correctPassword) {
                    const userData = {
                        username: doc.data().username,
                        favs: doc.data().favs,
                        sent: doc.data().sent
                    }
                    res.send(userData) 
                } else { 
                    res.sendStatus(401) 
                }
            } 
        }); 
 
        if (!userFound) {
            res.sendStatus(401) 
        }
    }
})

// - - - - GET to have all dogs - - - - 

app.get('/api/firebase', async (req, res) => {
    try {
        const dogsRef = db.collection('dogs');
        const snapShot = await dogsRef.get();
        
        let dogList = [];

        snapShot.forEach(doc => {
            dogList.push(doc.data())
        });
        res.send(dogList)

    } catch(error) {
        res.send(error)
    }
});

// - - - - Save a new dog to database - - - - 

app.post('/addnewdog', async (req, res) => {
    const newDog = JSON.parse(req.body.object)

    const dogsRef = db.collection('dogs');
    const snapShot = await dogsRef.get();
    newDog.id = snapShot.size + 1;
    newDog.imageSrc = `/dog-images/${req.files.file.name}`;

    try {
        const response = dogsRef.add(newDog);
    } catch (error) {
        res.send(error)
    }
    const uploadPath = '../frontend/public/dog-images/' + req.files.file.name;

    req.files.file.mv(uploadPath, function (err) {
        if (err)
            return res.status(500).send(err);
        res.send(`Image uploaded and ${newDog.name} added to database!`);
    })
})

// - - - - Search dogs in database - - - -

app.get('/api/search', async (req, res) => {
    let dogList = [];

    try {
        const dogsRef = db.collection('dogs');
        const snapShot = await dogsRef.get();

        snapShot.forEach(doc => {
            dogList.push(doc.data())
        });

    } catch(error) {
        res.send(error)
    }

    const gender = req.query.gender; 
    const size = req.query.size; 
    const breed = req.query.breed; 
    const traits = req.query.traits; 
    
    let newDogList = []
    
    const filterPhysicalAppearance = function (dog) {
        if (breed === "mindegy") {
            return (
                dog.size === size 
                && dog.gender === gender  
            )
        } else {
            return (
                dog.size === size 
                && dog.gender === gender 
                && dog.breed === breed
            )
        }
    }
    
    if (req.query.traits == undefined) {
        newDogList = dogList.filter(filterPhysicalAppearance) 

        } else {

        if (typeof traits === "string") {
            newDogList = dogList
                .filter(filterPhysicalAppearance)
                .filter(dog => {
                    return dog.traits.includes(traits)
                })
    
        } else {
            newDogList = dogList
            .filter(filterPhysicalAppearance)
            .filter(dog => {
                return (traits.every(trait => {
                    return dog.traits.includes(trait)
                }))
            })
        }
    }
    res.send(newDogList)
});

app.listen(process.env.PORT || port, () => {
    console.log('You are connected')
})