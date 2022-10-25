const express = require('express');
const app =express();
const fs = require('fs');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser'); // to read POST request body
const { db } = require('./admin'); // from admin.js, firestore
const bcrypt = require('bcrypt'); // library to hash passwords
const cors = require('cors');
// const path = require('path'); ??

require('dotenv').config();


app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());
app.use(express.static('../frontend'));
app.use(cors());


const port = 5000;



// - - - - FIREBASE - - - -


// - - - - POST to register new user in Firebase - - - - 

app.post('/register', async (req, res) => {
    const username = req.body.username;
    const plainTextPassword = req.body.password;

    console.log(username)
    console.log(plainTextPassword)
    
    const usersRef = db.collection('users'); // we choose the collection from Firebase which we want to check
    const newUser = usersRef.doc()
    const snapShot = await usersRef.where('username', '==', username).get(); //compare given username to the ones in the database
    console.log(snapShot)
    
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
                const correctPassword = bcrypt.compareSync(plainTextPassword, doc.data().password); // boolean
                if (correctPassword) {
                    const userData = {
                        username: doc.data().username,
                        favs: doc.data().favs,
                        sent: doc.data().sent
                    }
                    res.send(userData) //sending an object to frontend
                } else { //Incorrect password
                    res.sendStatus(401) //Unauthorized
                }
            } 
        }); 
        
        //what if username is not found in database?   
        if (!userFound) {
            res.sendStatus(401) //Unauthorized
        }
    }


})



// - - - - - GET to have all dogs - - - - - 

// JSON FILE

app.get('/api', (req, res) => {
    fs.readFile('dog-names-data.json', 'utf8', function (err, data) {
        const dogData = JSON.parse(data);
        res.send(dogData)
    });
});

//  Firebase 

app.get('/api/firebase', async (req, res) => {
    try {
        const dogsRef = db.collection('dogs');
        const snapShot = await dogsRef.get();
        console.log(snapShot.size)
        
        //console.log(snapShot.size)
        let dogList = [];

        snapShot.forEach(doc => {
            dogList.push(doc.data())
        });
        res.send(dogList)

    } catch(error) {
        res.send(error)
    }
});



// - - - - POST to save a new dog - - - - 

app.post('/addnewdog', async (req, res) => {
    const newDog = JSON.parse(req.body.object)
    console.log(newDog.name)
    console.log(req.files.file)


    // JSON file - not used anymore

    /* fs.readFile('dog-names-data.json', 'utf8', function (err, data) {
        let dogs = JSON.parse(data);

        newDog.id = (dogs[dogs.length - 1].id) + 1;
        newDog.imageSrc = `/dog-images/${req.files.file.name}`;
        newDog.uploader = 'Réka';

        dogs.push(newDog)

        fs.writeFile('dog-names-data.json', JSON.stringify(dogs, null, 4), function (err) {
            if (err) throw err;
        });

    }) */

    
    // Firebase

    const dogsRef = db.collection('dogs');
    const snapShot = await dogsRef.get();
    newDog.id = snapShot.size + 1;
    newDog.imageSrc = `/dog-images/${req.files.file.name}`;

    try {
        const response = dogsRef.add(newDog);
        //itt még hozzá kell adni az user-hez a sent array-be a kutya id-ját
    } catch (error) {
        res.send(error)
    }
    console.log('dog sent to database')


    //file upload - stays the same for now

    const uploadPath = '../frontend/public/dog-images/' + req.files.file.name; //feltöltött fájlok helye

    req.files.file.mv(uploadPath, function (err) {
        if (err)
            return res.status(500).send(err);
        res.send(`Image uploaded and ${newDog.name} added to database!`);
    })



})



// - - - - - GET to search dogs - - - - - 

app.get('/api/search', async (req, res) => {
    /* fs.readFile('dog-names-data.json', 'utf8', function (err, data) { 
        const dogList = JSON.parse(data);
        
    }); */
    
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


    
    const gender = req.query.gender; // lány / fiú
    const size = req.query.size; // kicsi / közepes /nagy 
    const breed = req.query.breed; // OPTIONAL - (default: mindegy)  / keverék / tacskó ...stb 
    const traits = req.query.traits; // OPTIONAL - 0, 1 or more
    
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
        //if no personality traits are defined: search all dogs based on physical appearance
        newDogList = dogList.filter(filterPhysicalAppearance) 

        } else {
        //if at least one trait is defined, search also in those

        if (typeof traits === "string") {
            //if only 1 trait is defined (query parameter is treated as string)
            newDogList = dogList
                .filter(filterPhysicalAppearance)
                .filter(dog => {
                    return dog.traits.includes(traits)
                })
            console.log("only one trait was given")
            console.log(newDogList)
    
        } else {
            // if more than 1 traits are given
            console.log("more traits were given")
            console.log(traits)

            newDogList = dogList
                .filter(filterPhysicalAppearance)
                .filter(dog => {
                    return (traits.every(trait => {
                        return dog.traits.includes(trait)
                    }))
                })

            /* filteredDogList = dogList.filter(filterPhysicalAppearance)
            filteredDogList.forEach(dog => {
                if (traits.every(trait => {
                    return dog.traits.includes(trait)
                })) {
                    newDogList.push(dog)
                }

            }); */

            /*
            for (const trait of traits) {
                // iterate through all traits given
                if (newDogList.length === 0) {
                    //1st iteration
                    newDogList = dogList
                        .filter(dog => {
                            return dog.traits.includes(trait)
                        })
                        .filter(filterPhysicalAppearance)
                        
                    console.log("at least 2 traits were given, 1st iteration")
                    console.log(newDogList)
                    
                } else {
                    // 2nd or more iteration
                    newDogList = newDogList
                        .filter(dog => {
                            return dog.traits.includes(trait)
                        })
                    console.log("second (or more) iteration")
                    console.log(newDogList)
                }
            }
            */

        }

    }

    res.send(newDogList)
    

});




// - - - - PORT - - - - 

app.listen(process.env.PORT || port, () => {
    console.log('You are connected')
})