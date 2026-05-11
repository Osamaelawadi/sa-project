const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Kafka } = require('kafkajs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3003;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/order_db';
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

mongoose.connect(MONGO_URI).then(() => console.log('Order Service: MongoDB connected'));

const orderSchema = new mongoose.Schema({
  userId: String,
  items: [{ productId: String, quantity: Number, price: Number }],
  totalAmount: Number,
  status: { type: String, default: 'PENDING' },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [KAFKA_BROKER],
  retry: { initialRetryTime: 1000, retries: 10 }
});

const producer = kafka.producer({ allowAutoTopicCreation: true });
let isConnected = false;

const connectProducer = async () => {
  try {
    await producer.connect();
    isConnected = true;
    console.log('Order Service: Kafka Producer connected');
  } catch (err) {
    console.error('Order Service: Kafka connection failed', err.message);
    setTimeout(connectProducer, 5000);
  }
};
connectProducer();

app.get('/health', (req, res) => {
  res.json({ service: 'order-service', kafka: isConnected, mongo: mongoose.connection.readyState === 1 });
});

app.post('/orders', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();

    if (isConnected) {
      await producer.send({
        topic: 'order.created',
        messages: [{ value: JSON.stringify(order) }],
      });
      console.log(`Order Service: Event order.created emitted for ${order._id}`);
    } else {
      console.warn('Order Service: Kafka not connected, event NOT emitted');
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Order Service Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/orders', async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

app.listen(PORT, () => console.log(`Order Service on ${PORT}`));
