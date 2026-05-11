const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Kafka } = require('kafkajs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/user_db';
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

mongoose.connect(MONGO_URI).then(() => console.log('User Service: MongoDB connected'));

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  fullName: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: [KAFKA_BROKER],
  retry: { initialRetryTime: 1000, retries: 10 }
});

const producer = kafka.producer({ allowAutoTopicCreation: true });
let isConnected = false;

const connectProducer = async () => {
  try {
    await producer.connect();
    isConnected = true;
    console.log('User Service: Kafka Producer connected');
  } catch (err) {
    console.error('User Service: Kafka connection failed', err.message);
    setTimeout(connectProducer, 5000);
  }
};
connectProducer();

app.get('/health', (req, res) => {
  res.json({ service: 'user-service', kafka: isConnected, mongo: mongoose.connection.readyState === 1 });
});

app.post('/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();

    if (isConnected) {
      await producer.send({
        topic: 'user.registered',
        messages: [{ value: JSON.stringify(user) }],
      });
      console.log(`User Service: Event user.registered emitted for ${user._id}`);
    }

    res.status(201).json(user);
  } catch (error) {
    console.error('User Service Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

app.listen(PORT, () => console.log(`User Service on ${PORT}`));
