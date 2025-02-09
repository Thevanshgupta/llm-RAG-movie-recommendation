// server.js
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://admin:admin@bloodbank.lppf54s.mongodb.net/?retryWrites=true&w=majority&appName=bloodbank";
const client = new MongoClient(uri);

async function connectToMongo() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");
    return client.db('sample_mflix').collection('movies');
  } catch (err) {
    console.error("Connection error:", err);
    process.exit(1);
  }
}

app.post('/api/query', async (req, res) => {
  try {
    const collection = await connectToMongo();
    const { query } = req.body;
    
    // Simple natural language processing
    let mongoQuery = {};
    if (query.toLowerCase().includes('action')) {
      mongoQuery = { genres: 'Action' };
    } else if (query.toLowerCase().includes('comedy')) {
      mongoQuery = { genres: 'Comedy' };
    } else if (query.toLowerCase().includes('year')) {
      const year = parseInt(query.match(/\d+/)[0]);
      mongoQuery = { year: { $gte: year } };
    }

    const results = await collection.find(mongoQuery).limit(5).toArray();
    res.json({ 
      response_code: "200",
      content: results 
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));