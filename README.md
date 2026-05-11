# 🌌 Stellar E-Commerce Microservices

A modern, event-driven e-commerce platform built with a microservices architecture. This project demonstrates asynchronous communication between services using Apache Kafka and containerization with Docker.

## 🚀 Architecture Overview

The system consists of three independent backend services and a premium React frontend:

1.  **User Service (Port 3001)**: Manages user registrations and profiles. Produces `user.registered` events.
2.  **Product Service (Port 3002)**: Manages the product catalog and inventory. Consumes `order.created` events to update stock levels.
3.  **Order Service (Port 3003)**: Handles order processing. Produces `order.created` events when a new order is placed.
4.  **Frontend (Port 5173)**: A sleek React dashboard for interacting with all services.

### 🏗️ Technology Stack
- **Backend**: Node.js, Express, KafkaJS, Mongoose
- **Frontend**: React, Vite, Framer Motion, Lucide React
- **Events**: Apache Kafka
- **Database**: MongoDB (Decentralized databases for each service)
- **Orchestration**: Docker & Docker Compose

## 🛠️ Getting Started

### Prerequisites
- Docker & Docker Compose installed on your machine.

### Running the System
1.  Clone the repository or navigate to the project directory.
2.  Run the following command to build and start all services:
    ```bash
    docker compose up --build
    ```
3.  Wait for all containers to start (especially Kafka, which may take a few seconds).
4.  Access the frontend at: [http://localhost:5173](http://localhost:5173)

## 🔄 Event Flow (Kafka)
- **Order Created**: When you place an order in the frontend, the **Order Service** saves it and emits an `order.created` event. The **Product Service** listens for this event and automatically decrements the stock for the ordered products.
- **User Registered**: When a new user registers, the **User Service** emits a `user.registered` event, which can be used for future integrations like notifications or analytics.

## 📁 Project Structure
- `/user-service`: User management microservice.
- `/product-service`: Inventory and product microservice.
- `/order-service`: Order processing microservice.
- `/frontend`: React application.
- `docker-compose.yml`: Orchestration configuration for all services and infrastructure (Kafka, Zookeeper, MongoDB).
