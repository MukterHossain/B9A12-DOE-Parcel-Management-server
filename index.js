const express = require('express')
require('dotenv').config();
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
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
    const bookPayCollection = client.db('doeParcelManage').collection('bookPays')
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


        // ********** Home page related api **************
        // features related api 
        app.get('/features', async (req, res) => {
          const query = req.body;
          const result = await featureCollection.find(query).toArray()
          res.send(result)
        })
        // features Number data from db 
        app.get('/featureNumber', async(req, res) =>{
          const totalBooked = await bookingCollection.countDocuments();
          const totalDelivered = await bookingCollection.countDocuments({status:' Delivered'});
          const totalUser = await userCollection.countDocuments()
          res.send({totalBooked, totalDelivered, totalUser})
        })
        // get top delivery Men data from db 
        app.get('/topDeliMen', async(req, res) =>{
          const users = await userCollection.find({role:'deliveryMen'}).toArray();;
          const deliveredData = await Promise.all(users.map(async(user) =>{
            const deliveryMenId = user._id.toString();
            const bookings = await bookingCollection.findOne({deliveryMenId: deliveryMenId});
            const reviews = await reviewCollection.find({deliveryMenId: deliveryMenId}).toArray();
            const totalRatings = reviews.reduce((acc, review) => acc + parseFloat(review.rating), 0)
            const averageRating = reviews.length > 0? totalRatings / reviews.length : 0;
            return {
              name: user.name,
              image:user.image,
              parcelsDelivered:bookings ? bookings.parcelsDelivered : 0,
              averageRating:averageRating
            }
          }));
          const topDeliveryMen = deliveredData.sort((a, b) => b.parcelsDelivered - a.parcelsDelivered || b.averageRating - a.averageRating).slice(0, 3)
         
          res.send(topDeliveryMen)
        })


    // ******** user related api *********
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })
    // ‍Update a data  Image in db
    app.put('/updateImage/:id', async (req, res) => {
      const id = req.params.id;
      const imageData = req.body;
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

    // get data user profile
    app.get('/userProfile/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await userCollection.findOne(query)
      res.send(result)
    })
    // get data user Role
    app.get('/userRole', verifyToken, async (req, res) => {
      const query = req.body.role;
      const result = await userCollection.findOne(query)
      res.send(result)
    })
    // user role api verifyUser,
    app.get('/userRole/user/:email', verifyToken,  async (req, res) => {
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
      const options = { upsert: true }
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

    // get Payment data from db
    app.get('/book-payment/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await bookPayCollection.find(query).toArray()
      res.send(result)
    })




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
    app.get('/bar-chart', async (req, res) => {
      const barBooking = await bookingCollection.find({}, {
        projection: {          
          bookingDate: 1,
          price: 1,
        }
      }).toArray()
      // console.log('barBooking', barBooking);
      const chartData = barBooking.map(book => {
        const day = new Date(book.bookingDate).getDate()
        const month = new Date(book.bookingDate).getMonth() + 1
        const data = [`${month}/${day}`, book?.price]
        return data
      })
      chartData.unshift(['Day', 'Booked'])
      res.send(chartData)
    })
    // get data from bookings for Line chart verifyToken,
    app.get('/line-chart', async (req, res) => {
      const bookedParcels = await bookingCollection.countDocuments({status: 'Pending'})
      const deliveredParcels = await bookingCollection.countDocuments({status: 'Delivered'})
      res.send({booked:bookedParcels,delivered:deliveredParcels})
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
    app.get('/parcel-allData', async (req, res) => {
      const   {fromDate,toDate}  = req.query
      let query= {}
      if(fromDate || toDate) {
         query = {
          requestedDate: {
            $gte: fromDate,
            $lte: toDate,
          }
        };
      }
      
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })

    // Get all DeliveryMen **********************************************
    app.get('/all-delivery-men/deliveryMen', async (req, res) => {
      const query = { role: 'deliveryMen' }
      const result = await userCollection.find(query).toArray()
      res.send(result)
    })
    // Get all booking data for Id 
    app.get('/book-manage', async (req, res) => {
      const query = req.body
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })
    // Manage ‍Change to deliveryMen  bookings in db
    app.put('/deliveryMenUpdate/:id', async (req, res) => {
      const id = req.params.id;
      const deliveryMenInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          // ...deliveryMenInfo,
          status: deliveryMenInfo.status,
          deliveryMenId: deliveryMenInfo.deliveryMenId,
          approximateDate: deliveryMenInfo.approximateDate,
        },
      }
      const result = await bookingCollection.updateOne(query, updateDoc, options);
      res.send(result)
    })
    // all user data count for all users and  Pagination 
    app.get('/allUsers',  async (req, res) => {
      const size = parseInt(req.query.size)
      const page = parseInt(req.query.page) - 1
      const users = await userCollection.find().skip(page * size).limit(size).toArray();
      for(let user of users){
        const bookings = await bookingCollection.find({email: user.email}).toArray();
        user.totalBooking = bookings.length
        user.totalSpentAmount = bookings.reduce((acc, booking) => acc + parseFloat(booking.price), 0)
      }
      res.send(users)
    })

    // all user data count for Pagination
    app.get('/userCount', async (req, res) => {
      const count = await userCollection.estimatedDocumentCount()
      res.send({ count })
    })








    //********  delivery men api ******* verifyToken, verifyDeliveryMen,
    app.get('/users/isDeliveryMen/:email', async (req, res) => {
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
    // Delivery List Api             
    app.get('/deliveryList', async (req, res) => {
      const query = { role: 'deliveryMen' }
      const user = await userCollection.findOne(query)
      const menId = { deliveryMenId: user?._id.toString() };  
      const result = await bookingCollection.find(menId).toArray()
      res.send(result)
    })
    // get data for view location
    app.get('/location/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.findOne(query)
      res.send(result)
    })
    // List Status ‍Change to Cancel  bookings in db
    app.put('/listStatusUpdate/:id', async (req, res) => {
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
    //  Status ‍Change to Delivered  bookings in db  patch
    app.put('/statusDelivered/:id', async (req, res) => {
      const id = req.params.id;
      const deliveredChange = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...deliveredChange,
        },
      }
      const result = await bookingCollection.updateOne(query, updateDoc, options);
      res.send(result)
    })
    // get data for delivery review
    app.get('/delivery-review', async (req, res) => {
      const query = req.body;
      const result = await reviewCollection.find(query).toArray()
      res.send(result)
    })




    // *********** Review Related Data ************* 
      //user Id for review
    app.get('/reviewData/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await bookingCollection.findOne(query)
      res.send(result)
    })

    
    app.post('/review/:id', async (req, res) => {
      const reviewData = req.body;
      const query = { deliveryMenId: reviewData.deliveryMenId };

      const existingData = await reviewCollection.findOne(query)
      console.log(existingData)
      if (existingData) {
        return res.send({ message: 'Data already exists', insertedId: null })
      }
      const result = await reviewCollection.insertOne(reviewData);
      res.send(result)
    })




    // ********** Booking Related ***********
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
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.findOne(query)
      res.send(result)
    })

    // ‍Update a data  bookings in db
    app.put('/updateBook/:id', async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      const query = { _id: new ObjectId(id)};
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






    // ********** Payment API **********
    // Manage ‍Change to deliveryMen  bookings in db
    app.get('/payment-book/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.findOne(query);
      res.send(result)
    })

    // Payment intent 
    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      const price = req.body.price;
      const amount = parseFloat(price) * 100;
      if (!price || amount < 1) return
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'BDT',
        payment_method_types: ['card'],
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    // save payment data in db
    app.post('/bookPay', verifyToken, async (req, res) => {
      const bookData = req.body;
      const result = await bookPayCollection.insertOne(bookData)
      const bookId = bookData?.bookId;
      const query = { _id: new ObjectId(bookId) }
      const updateDoc = {
        $set: { booked: true },
      }
      const updateBookings = await bookingCollection.updateOne(query, updateDoc)
      res.send({ result, updateBookings })
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