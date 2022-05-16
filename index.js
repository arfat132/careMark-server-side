const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vdeiq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const appoinmentSlotsCollection = client.db("careMark").collection("appoinmentSlots");
        const bookingCollection = client.db("careMark").collection("bookings");
        const userCollection = client.db("careMark").collection('users');

        app.get('/appoinmentSlots', async (req, res) => {
            const query = {};
            const cursor = appoinmentSlotsCollection.find(query);
            const appoinmentSlots = await cursor.toArray();
            res.send(appoinmentSlots);
            console.log(appoinmentSlots);
        });

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            console.log(filter);
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            // const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            console.log(result);
            res.send(result);
           
        });
        // Warning: This is not the proper way to query multiple collection. 
        // After learning more about mongodb. use aggregate, lookup, pipeline, match, group
        app.get('/available', async (req, res) => {
            const date = req.query.date;
            // step 1:  get all appoinmentSlots
            const appoinmentSlots = await appoinmentSlotsCollection.find().toArray();
            // step 2: get the booking of that day. output: [{}, {}, {}, {}, {}, {}]
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();
            // step 3: for each appoinmentSlot
            appoinmentSlots.forEach(appoinmentSlot => {
                // step 4: find bookings for that appoinmentSlot. output: [{}, {}, {}, {}]
                const appoinmentSlotBookings = bookings.filter(book => book.treatmentName === appoinmentSlot.name);
                // step 5: select slots for the appoinmentSlot Bookings: ['', '', '', '']
                const bookedSlots = appoinmentSlotBookings.map(book => book.slot);
                //console.log(bookedSlots);
                // step 6: select those slots that are not in bookedSlots
                appoinmentSlot.slots = appoinmentSlot.slots.filter(slot => !bookedSlots.includes(slot));
            });
            res.send(appoinmentSlots);
        })

        app.get('/booking', async (req, res) => {
            const patientEmail = req.query.patientEmail;
            const query = { patientEmail: patientEmail };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { treatmentName: booking.treatmentName, date: booking.date, patientEmail: booking.patientEmail }
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await bookingCollection.insertOne(booking);
            return res.send({ success: true, result });
        });

    } finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('CareMark Server is Running')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})