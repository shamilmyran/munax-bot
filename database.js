const { MongoClient } = require("mongodb");

let client;
let dbInstance;

const connectWithRetry = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const url = process.env.MONGODB_URL || "mongodb+srv://munaxx1000_db_user:j6OdootNqbrmtvOV@cluster0.qevlvpg.mongodb.net/TGWAY?retryWrites=true&w=majority";
      client = new MongoClient(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        // Force TLS 1.2 (helps with some Atlas issues)
        tls: true,
        tlsAllowInvalidCertificates: false // set to true only for debugging
      });
      await client.connect();
      dbInstance = client.db("TGWAY");
      console.log("✅ Database connected successfully");
      return dbInstance;
    } catch (err) {
      console.log(`❌ Database connection attempt ${i + 1} failed:`, err.message);
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, 5000)); // wait 5s before retry
    }
  }
};

module.exports.connect = async () => {
  try {
    return await connectWithRetry();
  } catch (e) {
    console.log("❌ Database didn't connect after multiple attempts");
    return false;
  }
};

module.exports.get = () => dbInstance;
