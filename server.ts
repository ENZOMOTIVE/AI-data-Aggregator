import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();
const app = express();
app.use(express.json());

const connectionString = process.env.mongodb_connection!;
const mongoclient = new MongoClient(connectionString);

async function getRawData() {
  const database = mongoclient.db("sample_database");
  const collection = database.collection("rawDatamongo");
  const data = await collection.find({}).toArray();
  return data;
}

app.get("/process-data", async (req: Request, res: Response) => {
  try {
    const rawData = await getRawData() || [];

    const structuredData = await Promise.all(
      rawData.map(async (item) => {
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4",
            messages: [
              {
                role: "user",
                content: `Structure this data as JSON with keys: name, age, profession, city: ${item.rawText}`
              }
            ]
          },
          {
            headers: {
              "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );

        return JSON.parse(response.data.choices[0].message.content);
      })
    );

    res.json(structuredData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

async function startServer() {
  try {
    await mongoclient.connect();
    console.log("Connected to MongoDB successfully");

    app.listen(3000, () => console.log("Server running on port 3000"));
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

startServer();
