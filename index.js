const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();
const uri = process.env.MONGODB_URI;
const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("ideavault");
    const ideaVaultCollection = db.collection("ideas");

    // trending section
    app.get("/trending", async (req, res) => {
      const result = await ideaVaultCollection.find().limit(3).toArray();
      res.json(result);
    });

    app.get("/idea", async (req, res) => {
      const result = await ideaVaultCollection.find().toArray();
      res.json(result);
    });

    app.get("/idea/:id", async (req, res) => {
      const { id } = req.params;
      const result = await ideaVaultCollection.findOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });
    // my booking data
    app.get("/my-ideas", async (req, res) => {
      const userId = req.query.userId;

      if (!userId) {
        return res.status(400).send({
          message: "userId is required",
        });
      }

      try {
        const result = await ideaVaultCollection.find({ userId }).toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch user ideas",
          error,
        });
      }
    });

    //idea update data
    app.patch("/idea/:id", async (req, res) => {
      const { id } = req.params;
      console.log(id);
      const userId = req.query.userId;
      const updatedData = req.body;

      if (!userId) {
        return res.status(400).send({
          success: false,
          message: "userId is required",
        });
      }

      try {
        const filter = {
          _id: new ObjectId(id),
          userId: userId,
        };

        const updatedDoc = {
          $set: {
            title: updatedData.title,
            shortDescription: updatedData.shortDescription,
            detailedDescription: updatedData.detailedDescription,
            category: updatedData.category,
            tags: updatedData.tags,
            imageUrl: updatedData.imageUrl,
            estimatedBudget: updatedData.estimatedBudget,
            targetAudience: updatedData.targetAudience,
            problemStatement: updatedData.problemStatement,
            proposedSolution: updatedData.proposedSolution,
          },
        };

        const result = await ideaVaultCollection.updateOne(filter, updatedDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Idea not found or unauthorized",
          });
        }

        res.send({
          success: true,
          message: "Idea updated successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to update idea",
          error: error.message,
        });
      }
    });

    // my idea delete
    app.delete("/idea/:id", async (req, res) => {
      const { id } = req.params;
      const userId = req.query.userId;

      console.log("Delete ID:", id);

      if (!userId) {
        return res.status(400).send({
          success: false,
          message: "userId is required",
        });
      }

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          success: false,
          message: "Invalid idea id",
        });
      }

      try {
        const filter = {
          _id: new ObjectId(id),
          userId: userId,
        };

        const result = await ideaVaultCollection.deleteOne(filter);

        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Idea not found or unauthorized",
          });
        }

        res.send({
          success: true,
          message: "Idea deleted successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to delete idea",
          error: error.message,
        });
      }
    });
    app.post("/idea", async (req, res) => {
      const ideaData = req.body;
      console.log(ideaData);
      const result = await ideaVaultCollection.insertOne(ideaData);
      res.json(result);
    });

    app.get("/ideas/search", async (req, res) => {
      const query = req.query.q;

      const result = await ideaVaultCollection
        .find({
          title: {
            $regex: query,
            $options: "i",
          },
        })
        .toArray();

      res.send(result);
    });

    // category filtaring
    app.get("/ideas/filter", async (req, res) => {
      try {
        const { category, startDate, endDate } = req.query;

        let query = {};

        if (category) {
          query.category = category;
        }

        if (startDate && endDate) {
          query.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          };
        }

        const result = await ideaVaultCollection.find(query).toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Server error" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
