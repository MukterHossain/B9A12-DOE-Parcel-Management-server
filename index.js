const express = require('express')
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
const jwt = require('jsonwebtoken');



const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: ['http://localhost:5173','https://b9a12-doe-parcel-management.web.app', 'https://b9a12-doe-parcel-management.firebaseapp.com/'],
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
    
    // jwt related api
app.post('/jwt', async(req, res) =>{
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '365d'
  })
  res.send({token})
})

// middleware/ verify Token 
const verifyToken = async(req, res, next) => {
  // console.log('inside verify token', req.headers.authorization);
  if(!req.headers.authorization){
    return res.status(401).send({message: 'unauthorized access'})
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
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
  const deliveryMen = user?.role === 'deliveryMen';
  if (!deliveryMen) {
    return res.status(403).send({ message: 'forbidden access' })
  }
  next()
}

//user related api
app.get('/users', verifyToken, verifyAdmin, async(req, res) =>{
  const result = await userCollection.find().toArray();
  res.send(result)
})

app.get('/users/admin/:email', verifyToken, async(req, res) =>{
  const email = req.params.email;
  if(email !== req.decoded.email){
    return res.status(403).send({message: 'forbidden access'})
  }
  const query = {email: email};
  const user = await userCollection.findOne(query);
  let admin = false;
  if(user){
    admin = user?.role === 'admin';
  }
  res.send({admin})
})


app.post('/users', async(req, res) =>{
  const user = req.body;
  // insert email if user doesnot exists
  const query = {email: user.email}
  const existingUser = await userCollection.findOne(query)
  if(existingUser){
    return res.send({message: 'user already exists', insertedId: null})
  }
  const result = await userCollection.insertOne(user);
  res.send(result)
})
app.patch('/users/admin/:id', async(req, res) =>{
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)};
  const updatedDoc = {
    $set: {
      role: 'admin'
    }
  }
  const result = await userCollection.updateOne(filter, updatedDoc);
  res.send(result)
})



// delivery men api
app.get('/users/deliveryMen/:email', verifyToken, verifyDeliveryMen, async(req, res) =>{
  const email = req.params.email;
  if(email !== req.decoded.email){
    return res.status(403).send({message: 'forbidden access'})
  }
  const query = {email: email};
  const user = await userCollection.findOne(query);
  let deliveryMen = false;
  if(user){
    deliveryMen = user?.role === 'deliveryMen';
  }
  res.send({deliveryMen})
})

app.patch('/users/deliveryMen/:id', verifyDeliveryMen, async(req, res) =>{
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)};
  const updatedDoc = {
    $set: {
      role: 'deliveryMen'
    }
  }
  const result = await userCollection.updateOne(filter, updatedDoc);
  res.send(result)
})



// booking related api      
app.get('/bookings',   async(req, res) =>{
  const query = req.body;
  const result = await bookingCollection.find(query).toArray();
  res.send(result)
})
app.get('/bookings',  async(req, res) =>{
  const query = req.body;
  const result = await bookingCollection.find(query).toArray();
  res.send(result)
})
app.post('/bookings', async(req, res) =>{
  const item = req.body;
  const result = await bookingCollection.insertOne(item)
  res.send(result)
})


// features related api
app.get('/features', async(req, res) =>{
  const query = req.body;
  const result = await featureCollection.find(query).toArray()
  res.send(result)
})


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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