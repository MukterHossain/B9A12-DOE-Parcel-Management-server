const express = require('express')
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
const jwt = require('jsonwebtoken');



const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'https://b9a12-doe-parcel-management.web.app', 'https://b9a12-doe-parcel-management.firebaseapp.com', 'https://y-red-five.vercel.app/'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xwmcx9f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection = client.db('doeParcelManage').collection('users')
    const featureCollection = client.db('doeParcelManage').collection('features')
    const bookingCollection = client.db('doeParcelManage').collection('bookings')
    const reviewCollection = client.db('doeParcelManage').collection('reviews')

    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d'
      })
      res.send({ token })
    })

    // middleware/ verify Token 
    const verifyToken = async (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })

    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }
    // use verify deliveryMen after verifyToken
    const verifyDeliveryMen = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isDeliveryMen = user?.role === 'deliveryMen';
      if (!isDeliveryMen) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }
    // use verify user role after verifyToken
    const verifyUser = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const normalUser = user?.role === 'user';
      if (!normalUser) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }




    // ******** user related api *********
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })
     // ‍Update a data  Image in db
     app.put('/updateImage/:id', async (req, res) => {
      const id = req.params.id;
      const imageData = req.body;
      console.log('Update image DATa',imageData)
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...imageData,
        },
      }
      const result = await userCollection.updateOne(query, updateDoc, options);
      res.send(result)
    })
    //user Id for review
    app.get('/review/:email',  async (req, res) => {
      const email = req.params.email;
      const query = {email: email}
      const result = await userCollection.findOne(query)
      res.send(result)
    })
    // get data user profile
    app.get('/userProfile/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = {email: email}
      const result = await userCollection.findOne(query)
      res.send(result)
    })
    // get data user Role
    app.get('/userRole', verifyToken, async (req, res) => {
      const query = req.body.role;
      // const query = {email: email}
      const result = await userCollection.findOne(query)
      res.send(result)
    })
// user role api verifyToken, verifyUser,
    app.get('/userRole/user/:email',  async (req, res) => {
      const email = req.params.email;
      // if (email !== req.decoded.email) {
      //   return res.status(403).send({ message: 'forbidden access' })
      // }
      const query = { email: email };
      const userData = await userCollection.findOne(query);
      let user = false;
      if (userData) {
        user = userData?.role === 'user';
      }
      res.send({ user })
    })
    
    //  Save user related api
    app.put('/user', async (req, res) => {
      const user = req.body;
      // insert email if user doesnot exists
      const query = { email: user?.email }
      const options = {upsert: true}
      const updateDoc = {
        $set: {
          ...user
        }
      }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.updateOne(query, updateDoc, options);
      res.send(result)
    })
    // app.post('/users', async (req, res) => {
    //   const user = req.body;
    //   // insert email if user doesnot exists
    //   const query = { email: user.email }
    //   const existingUser = await userCollection.findOne(query)
    //   if (existingUser) {
    //     return res.send({ message: 'user already exists', insertedId: null })
    //   }
    //   const result = await userCollection.insertOne(user);
    //   res.send(result)
    // })



    //********* Admin Related Api **********
    // admin data get
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin })
    })
    // get data from bookings by date  for admin statistics verifyToken,
    app.get('/bar-chart',  async (req, res) => {
      const barBooking = await bookingCollection.find({},{projection:{
        
      requestedDate:1,
      price: 1,
      }}).toArray()
      const chartData =barBooking.map(book =>{
        const day = new Date(book.requestedDate).getDate()
        const month = new Date(book.requestedDate).getMonth() + 1
        const data = [`${day}/${month}`, book?.price]
        return data
      }) 
      chartData.unshift(['Day', 'Booked'])
      res.send(chartData)
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    // Get All parcel data from booking
    app.get('/parcel-allData', async (req, res) =>{
      const query = req.body;
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })



    //********  delivery men api ******* verifyToken, verifyDeliveryMen,
    app.get('/users/isDeliveryMen/:email',  async (req, res) => {
      const email = req.params.email;
      // console.log(email)
      // if (email !== req.decoded.email) {
      //   return res.status(403).send({ message: 'forbidden access' })
      // }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      // console.log(user)
      let deliveryMen = false;
      if (user) {
        deliveryMen = user?.role === 'deliveryMen';
      }
      res.send({ deliveryMen })
    })

    app.patch('/users/deliveryMen/:id', verifyDeliveryMen, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'deliveryMen'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })




    // *********** Review Related Data ************* 
    // app.post('/review', async (req, res) => {
    //   const data = req.body;
    //   const result = await reviewCollection.insertOne(data)
    //   res.send(result)
    // })
    app.put('/review/:id', async (req, res) => {
      const reviewData = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      // insert email if user doesnot exists
      const options = {upsert: true}
      const updateDoc = {
        $set: {
          ...reviewData
        }
      }
      const existingData = await reviewCollection.findOne(query)
      if (existingData) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await reviewCollection.updateOne(query, updateDoc, options);
      res.send(result)
    })

    // ********** Booking Related ***********
    // booking related api      
    // app.get('/bookings', async (req, res) => {
    //   const query = req.body;
    //   const result = await bookingCollection.find(query).toArray();
    //   res.send(result)
    // })

    //get all bookings data for my parcel 
     app.get('/myParcel/:email', async (req, res) => {
      const email = req.params.email;
      let query = { email: email }
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })

    //get bookings data for update bookings 
    app.get('/updateData/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id:new ObjectId(id) }
      const result = await bookingCollection.findOne(query)
      res.send(result)
    })
   
    // ‍Update a data  bookings in db
    app.put('/updateBook/:id', async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...updateInfo,
        },
      }
      const result = await bookingCollection.updateOne(query, updateDoc, options);
      res.send(result)
    })
    // Status ‍Change to Cancel  bookings in db
    app.put('/statusUpdate/:id', async (req, res) => {
      const id = req.params.id;
      const StatusChange = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...StatusChange,
        },
      }
      const result = await bookingCollection.updateOne(query, updateDoc, options);
      res.send(result)
    })
    // Add bookings
    app.post('/bookings', async (req, res) => {
      const item = req.body;
      const result = await bookingCollection.insertOne(item)
      res.send(result)
    })


    // features related api
    app.get('/features', async (req, res) => {
      const query = req.body;
      const result = await featureCollection.find(query).toArray()
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Best Courier service')
})
app.listen(port, () => {
  console.log(`Courier service is running on port ${port}`)
})