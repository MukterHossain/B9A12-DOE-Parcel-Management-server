const express = require('express')
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
const jwt = require('jsonwebtoken');
// const cookieParser = require('cookie-parser')
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: ['http://localhost:5173',],
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
    
    // jwt related api
app.post('/jwt', async(req, res) =>{
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '365d'
  })
  res.send({token})
})


//user related api
app.get('/users', async(req, res) =>{
  console.log(req.headers)
  const result = await userCollection.find().toArray();
  console.log(result)
  res.send(result)
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
app.patch('/users/deliveryMen/:id', async(req, res) =>{
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


// features related api
app.get('/features', async(req, res) =>{
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