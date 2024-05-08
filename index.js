const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
//middlewares
app.use(cors(corsOptions));
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nrdgddr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const jobCollection = client.db("soloSphere").collection("jobs");
    const bidCollection = client.db("soloSphere").collection("bids");
    // await client.connect();
    app.post("/jobs", async (req, res) => {
      const jobData = req.body;
      const result = await jobCollection.insertOne(jobData);
      res.send(result);
    });

    app.get("/jobs", async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    });

    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/jobs/:email", async (req, res) => {
      const email = req.params.email;
      const result = await jobCollection
        .find({ "buyer.email": email })
        .toArray();
      res.send(result);
    });

    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/job/:id", async (req, res) => {
      const id = req.params.id;
      const jobData = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...jobData,
        },
      };
      const result = await jobCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    app.post("/bids", async (req, res) => {
      const bidData = req.body;
      const result = await bidCollection.insertOne(bidData);
      res.send(result);
    });

    app.get("/bids/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/bid-req/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "buyer.email": email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/bid-req/:id", async (req, res) => {
      // console.log(req.params.id, req.body)
      const id = req.params.id;
      const data = req.body;
      const updatedStatus = data.updatedStatus;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updatedStatus,
        },
      };
      const result = await bidCollection.updateOne(query, updateDoc);
      res.send(result)
    });
    app.patch("/accept-bid/:id", async(req, res) => {
      // console.log(req.params.id, req.body)
      const id = req.params.id;
      const data = req.body;
      const updatedStatus = data.updatedStatus;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updatedStatus,
        },
      };
      const result = await bidCollection.updateOne(query, updateDoc);
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from SoloSphere Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
