const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Kafka } = require('kafkajs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/product_db';
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

mongoose.connect(MONGO_URI).then(() => console.log('Product Service: MongoDB connected'));

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  stock: Number
});
const Product = mongoose.model('Product', productSchema);

const kafka = new Kafka({
  clientId: 'product-service',
  brokers: [KAFKA_BROKER],
  retry: { initialRetryTime: 1000, retries: 10 }
});

const consumer = kafka.consumer({ groupId: 'product-group', allowAutoTopicCreation: true });
let isConnected = false;

const runConsumer = async () => {
  try {
    await consumer.connect();
    isConnected = true;
    await consumer.subscribe({ topic: 'order.created', fromBeginning: true });
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const orderData = JSON.parse(message.value.toString());
        console.log(`Product Service: Received order.created for Order ${orderData._id}`);
        
        for (const item of orderData.items) {
          const updatedProduct = await Product.findByIdAndUpdate(
            item.productId, 
            { $inc: { stock: -item.quantity } },
            { new: true }
          );
          if (updatedProduct) {
            console.log(`Product Service: Updated ${updatedProduct.name} - New Stock: ${updatedProduct.stock}`);
          } else {
            console.error(`Product Service: Product ${item.productId} not found!`);
          }
        }
      },
    });
    console.log('Product Service: Kafka Consumer active');
  } catch (err) {
    console.error('Product Service: Kafka error', err.message);
    setTimeout(runConsumer, 5000);
  }
};
runConsumer();

app.get('/health', (req, res) => {
  res.json({ service: 'product-service', kafka: isConnected, mongo: mongoose.connection.readyState === 1 });
});

app.get('/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.post('/products', async (req, res) => {
  const product = new Product(req.body);
  await product.save();
  res.status(201).json(product);
});

app.listen(PORT, () => console.log(`Product Service on ${PORT}`));
