const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6nq2qod.mongodb.net/?retryWrites=true&w=majority`;

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
    const userCollection = client.db("buildingdb").collection("users");
    const apartmentCollection = client.db("buildingdb").collection("apartments");
    const cartCollection = client.db("buildingdb").collection("carts");
    const announcementCollection = client.db("buildingdb").collection("announcements");
    const faqsCollection = client.db("buildingdb").collection("faqs");


    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
      res.send({ token });
    })


    // miidleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access'});
      }

      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN,(err,decoded) => {
        if (err) {
          return res.status(401).send({message : 'unauthorized access'})
          
        }
        req.decoded = decoded;
        next();
      })
    }
    

    // admin verify 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = {email : email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({message: 'forbidden access'});
      }
      next();
    }


    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users',  verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      return res.send(result);
    });

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
      res.send({ admin });
    })

    app.get('/users/member/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'user'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
    app.patch('/usersRole/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const updatedDoc = {
        $set: {
          role: 'member'
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    })
    app.patch('/usersRole/:email', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const updatedDoc = {
        $set: {
          role: 'user'
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    })
    
    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/apartments', async (req, res) => {
      const result = await apartmentCollection.find().toArray();
      return res.send(result);
    })
     app.get('/faqs', async (req, res) => {
      const result = await faqsCollection.find().toArray();
      return res.send(result);
    })

    // itemCards
    app.post('/itemCards',async (req,res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    })

   app.get('/itemCarts/:email',verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
      
    })
    app.get('/agreements',verifyToken,verifyAdmin, async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
      
    })
    app.patch('/agreements/:id',verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const updatedDoc = {
        $set: {
          status: 'checked'
        }
      }
      const result = await cartCollection.updateOne(query, updatedDoc);
      res.send(result);
      
    })

   app.delete(`/itemCarts/:id`,verifyToken, async (req,res)=>{
     const id = req.params.id;
     const query = {_id : new ObjectId(id)};
     const result = await cartCollection.deleteOne(query);
     res.send(result);
   }) 


  //  announement
  app.post('/announcement',async (req,res) => {
    const item = req.body;
    const result = await announcementCollection.insertOne(item);
    res.send(result);
  })
  app.get('/announcement',verifyToken, async (req,res) => {
    const result = await announcementCollection.find().toArray();
    res.send(result);
  })
  app.delete(`/announcement/:id`,verifyToken,verifyAdmin, async (req,res)=>{
    const id = req.params.id;
    const query = {_id : new ObjectId(id)};
    const result = await announcementCollection.deleteOne(query);
    res.send(result);
  })
  app.get('/announcement/:id', async (req,res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const result = await announcementCollection.findOne(filter);
    console.log(result);
    res.send(result);
  })
  app.patch('/announcement/:id', verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const item = req.body;
    const updatedDoc = {
      $set: {
        ...item
      }
    }
    const result = await announcementCollection.updateOne(filter, updatedDoc);
    res.send(result);
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
  res.send('building is running')
})

app.listen(port, () => {
  console.log(`Building management running on port ${port}`);
})