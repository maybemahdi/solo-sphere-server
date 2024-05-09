const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://solo-sphere-9771a.web.app",
    "https://solo-sphere-9771a.firebaseapp.com",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
//middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// my middlewares
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.user = decoded;
    next();
  });
};

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

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.get("/logout", async (req, res) => {
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    //Api for pagination

    //get products count
    app.get("/getCount", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      let query = {
        job_title: { $regex: search, $options: "i" },
      };
      if (filter) query.category = filter;
      const count = await jobCollection.countDocuments(query);
      res.send({ count });
    });

    //get filtered jobs for filtering and pagination
    app.get("/all-job", async (req, res) => {
      const page = parseFloat(req.query.page);
      const size = parseFloat(req.query.size);
      const filter = req.query.filter;
      const sort = req.query.sort;
      const search = req.query.search;
      let query = {
        job_title: { $regex: search, $options: "i" },
      };
      if (filter) query.category = filter;
      let options = {};
      if (sort) options = { sort: { deadline: sort === "asc" ? 1 : -1 } };
      const result = await jobCollection
        .find(query, options)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // CRUD API fro jobs and bids

    //post job
    app.post("/jobs", async (req, res) => {
      const jobData = req.body;
      const result = await jobCollection.insertOne(jobData);
      res.send(result);
    });

    //get jobs
    app.get("/jobs", async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    });

    // get single job for (details)
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // get my posted jobs
    app.get("/jobs/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.user.email !== email) {
        return res.status(403).send("Forbidden Access");
      }
      const result = await jobCollection
        .find({ "buyer.email": email })
        .toArray();
      res.send(result);
    });

    // delete a job
    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    });

    //update a job
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

    //post a bid req
    app.post("/bids", async (req, res) => {
      const bidData = req.body;
      const query = {
        email: bidData.email,
        jobId: bidData.jobId,
      };
      const alreadyApplied = await bidCollection.findOne(query);
      if (alreadyApplied) {
        return res
          .status(400)
          .send("You have already placed a bid on this job");
      }
      const result = await bidCollection.insertOne(bidData);
      res.send(result);
    });

    //get my bids
    app.get("/bids/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.user.email !== email) {
        return res.status(403).send("Forbidden Access");
      }
      const query = { email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    //get requested bid on my jobs
    app.get("/bid-req/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.user.email !== email) {
        return res.status(403).send("Forbidden Access");
      }
      const query = { "buyer.email": email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    //update accept bid status
    app.patch("/accept-bid-req/:id", async (req, res) => {
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
      res.send(result);
    });

    //update reject bid status
    app.patch("/reject-bid-req/:id", async (req, res) => {
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
      res.send(result);
    });

    //update complete bid status
    app.patch("/confirm-bid/:id", async (req, res) => {
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
      res.send(result);
    });

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
