# grayscale
grayscale is a minimal image processing utility that converts color images to grayscale.

## why build this?
the main goal of this project is to understand how `message queues` and `workers` fit into a system that requires CPU-bound/slow processing. 

## how does it work?
on a traditional system with no `message queues` involved, the user would upload an image and wait for the server to process it and return the result.
the issue with this approach is that each request is **time-consuming**, the server can become overloaded with requests and potentially crash.
even if the server doesn't crash (which is highly unlikely at scale), each request will be subjected to longer wait times, which is a poor user experience.

so here is a question:
```
how can we handle multiple image requests without overloading the server and ensure a good user experience?
```

this is where we need to make changes to our architecture and introduce `message queues`. **message queues** is basically a software component that decouples the part of the system that **creates** work (the producer) from the part that **performs the work** (the consumer).

in our traditional architecture, the server does both, it receives the request and processes the image. there is no distinction between "producer" and "consumer" in this architecture.

in the new architecture, the server will only receive the request, validate it, and then **enqueue** the task of processing the image into a message queue. this way, the server can quickly respond to the user that their request has been received and is being processed, without having to wait for the image processing to complete.

so here is another question:
```
if the server is only responsible for enqueuing tasks, who will be responsible for processing the images?
```

this is where we introduce another component called the **worker**. a worker is a separate process that continuosly "listens" to the message queue for new tasks. when a new task is enqueued, the worker will pick it up, process the image, and then save the result. and the best part about **workers** is that it a completely separate process from the server, so it can run on a different machine or even multiple machines to handle more tasks concurrently.

now that we have a basic understanding of how `message queues` and `workers` fit into our architecture, we still have one important question to answer:
```
how does the user get the processed image back? the server is only responsible for enqueuing tasks, 
and the worker is responsible for processing the images, so how does the user get the 
processed image back in this architecture?
```

well, there are 2 primary ways to handle this:
1. **polling**: the user can periodically check the status of their request by sending a request to the server. the server can check if the image has been processed and return the result. this approach is simple to implement but can lead to unnecessary requests and increased load on the server.

2. **sse (server-sent events)**: the server can use server-sent events to push updates to the client when the image processing is complete. this way, the user doesn't have to continuously poll the server, and they will receive the result as soon as it's ready. this approach is more efficient as it completely eliminates the need for polling and reduces the load on the server.

3. **websockets**: similar to sse, but is bi-directional. its too overkill for this use case, since we only need one-way communication from the server to the client.

### architecture diagram
the project uses the following tech stack:
- **node/express**: for the API server.
- **bullmq/redis**: for the message queue and workers.
- **sharp**: for image processing.
- **cloudinary**: for image storage.
- **postgresql**: for the database.
- **grafana/k6**: for load testing.

![grayscale architecture diagram](./screenshots/grayscale_architecture.svg)

### workers and how they are configured in this project
if you take a look at `/src/worker.ts` file, you can see that we are using `cluster` module to create multiple worker processes. this is just a way to simulate multiple workers running on different machines. it utilizes the multiple cores of the machine it is running on. 

you can learn more about **clustering** in nodejs from a simple search on google. 

## load testing
to test the load on this system, i used a really great tool called `grafana/k6`. i tried various scenarios to test the system. and at one point it was able to handle `100+` concurrent requests per second!

i'm still new to this. i need to explore more about load testing and how to properly test a system and simulate real world scenarios. 

## bottlenecks in this architecture
each component can be scaled independently. for example, if we are receiving a lot of requests, we can add more workers to handle the load. if we are receiving a lot of requests, we can add more servers to handle the load. 

however, there are quite a few bottlenecks in this grayscale architecture. i'll talk about them below:

1. **polling**: the user has to poll the server constantly to check if the image has been processed.

2. **cloudinary**: this architecture involves cloud storage for storing images. network delays (or) if the service is down can lead to slower responses.

- **why do we need cloud storage?**: if we were to scale this application, we would need to store the image files somewhere. storing it on our own server would be a bad idea, since workers can be on different machines and wouldn't have access to the same storage.

## what i need to explore in the future?
1. server-sent-events (sse).
2. redis and pub/sub.
3. message queues like rabbitmq and kafka.

## how to run this project?

Follow these steps to set up and run the project locally.

### prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **PostgreSQL** (running locally or a remote instance)
- **Redis** (required for BullMQ)
- **Cloudinary Account** (for image storage and processing)

### 1. setup environment

1.  Clone the repository:
    ```bash
    git clone https://github.com/mohammednumaan/grayscale.git
    cd grayscale
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure environment variables:
    Copy the `.env.example` file to `.env` and fill in your credentials:
    ```bash
    cp .env.example .env
    ```
    Ensure you provide:
    - `CLOUDINARY_*`: Your Cloudinary API credentials.
    - `DATABASE_URL`: Your PostgreSQL connection string (e.g., `postgresql://user:password@localhost:5432/grayscale`).
    - `REDIS_HOST` & `REDIS_PORT`: Your Redis connection details.

### 2. database setup

Create the `file_jobs` table in your PostgreSQL database using the following SQL:

```sql
CREATE TABLE file_jobs (
    id SERIAL PRIMARY KEY,
    public_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_file_path TEXT NOT NULL,
    processed_file_path TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. running the application

You need to run both the API server and the worker process simultaneously.

#### Start the API Server
In one terminal, run:
```bash
npm run dev
```
The server will start on the port specified in your `.env` file (default is `3000`).

#### Start the Background Worker
In a second terminal, run:
```bash
npm run worker
```
This process will listen for new jobs in the Redis queue and process the images using Sharp and Cloudinary.

### 4. running the frontend

The frontend is a simple TypeScript application located in the `client/` directory.

1.  Build the client:
    ```bash
    npm run build:client
    ```

2.  Serve the frontend:
    Since the frontend is a static site, you can serve it using any simple HTTP server. For example:
    ```bash
    # Using npx (no installation required)
    npx serve client
    
    Open your browser and navigate to the address provided (e.g., `http://localhost:8080`).

### 5. running load tests (k6)

This project includes a `k6` load test script to simulate high-concurrency scenarios.

1.  **Install k6**: Follow the [official k6 installation guide](https://grafana.com/docs/k6/latest/set-up/install-k6/).
2.  **Run the test**:
    ```bash
    k6 run tests/load.test.ts
    ```

### 6. monitoring jobs

This project uses **Bull Board** to provide a UI for monitoring the background queues.

Once the API server is running, you can access the dashboard at:
`http://localhost:3000/admin/queues`

# final thoughts

overall, this was a really great project to understand how message queues and workers fit into a system. i'll be working on more projects in the future to explore more advanced backend concepts and patterns and build a solid foundation for building scalable and reliable systems.