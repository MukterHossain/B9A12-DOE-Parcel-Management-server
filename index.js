const express = require('express')
require('dotenv').config();
const app = express();
// const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
// const cookieParser = require('cookie-parser')
// const jwt = require('jsonwebtoken');
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



app.get('/', (req, res) => {
    res.send('Best Courier service')
  })
  app.listen(port, () => {
    console.log(`Courier service is running on port ${port}`)
  })