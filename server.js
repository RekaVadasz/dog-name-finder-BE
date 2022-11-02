const express = require('express');
const app =express();
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const { db } = require('./admin');
const bcrypt = require('bcrypt');
const cors = require('cors');
const {cloudinary} = require('./cloudinary');

require('dotenv').config();

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());
app.use(express.static('../frontend'));
app.use(cors());

const port = process.env.PORT || 5000;

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
                'favs': []
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
                        userId: doc.id,
                        username: doc.data().username,
                        favs: doc.data().favs
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

// - - - - Save favourites to user data - - - - 

app.put('/update', async (req, res) => {
    const userId = req.query.userId;
    const favId = parseInt(req.query.favId, 10);
    
    const usersRef = db.collection('users');
    const snapShot = await usersRef.doc(userId).get();
    const currentFavs = snapShot.data().favs;

    let newFavs = [];

    if (currentFavs.includes(favId)) {
        newFavs = currentFavs.filter((fav) => {
            return fav !== favId
        })
    } else {
        newFavs = [...currentFavs, favId]
    }

    try {
        usersRef.doc(userId).update( {
            favs: newFavs
        }) 
        console.log(newFavs)
        res.send({favs : newFavs})
    } catch (error) {
        console.log(error)
        res.status(500)
    }
})

// - - - - GET to have all dogs - - - - 

app.get('/api/firebase', async (req, res) => {
    try {
        const dogsRef = db.collection('dogs');
        const snapShot = await dogsRef.orderBy('id').get();
        
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
    
    try {
        // add image to Cloudinary
        const fileString = newDog.image;

        const uploadedResponse = await cloudinary.uploader.upload(fileString, {
            upload_preset: 'doggo_upload'
        })
        //console.log(uploadedResponse)
        newDog.imageSrc = uploadedResponse.url;
        console.log('Image added to Cloudinary')
        delete newDog.image;
        
        try {
            // add dog data to Firestore
            const dogsRef = db.collection('dogs');

            const snapShot = await dogsRef.get();
            newDog.id = snapShot.size + 1;

            const response = dogsRef.add(newDog);
            res.send(`Image uploaded and ${newDog.name} added to database!`);
    
        } catch (error) {
            console.log('Adding dog to Firebase failed')
            console.error(error)
            res.status(500)   
        } 

    } catch (error) {
        console.error('Image upload failed')
        console.error(error)
        res.sendStatus(500)
    }
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

app.listen(port, () => {
    console.log('You are connected')
})