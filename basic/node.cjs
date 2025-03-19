const http = require("http");
const {
  Worker,
  isMainThread,
  threadId,
  parentPort,
} = require("worker_threads");
const net = require("net");
const port = 9090;

const NUM_WORKERS = navigator.hardwareConcurrency - 1;

if (isMainThread) {
  // Create main acceptor server
  const server = http.createServer(
    {
      allowHalfOpen: true,
      pauseOnConnect: true,
    },
    (req, res) => {
      // This won't be called much as connections get passed to workers
      res.end("Main acceptor response (should be rare)");
    }
  );

  // Track worker sockets for round-robin distribution
  const workers = [];
  let currentWorker = 0;

  server.on("connection", (socket) => {
    if (workers.length > 0) {
      // Round-robin socket distribution
      const worker = workers[currentWorker];
      currentWorker = (currentWorker + 1) % workers.length;

      // Detach socket from server
      socket.pause();
      socket.removeAllListeners();

      worker.postMessage({
        type: "connection",
        fd: socket._handle.fd,
      });
    }
  });

  server.listen(port, () => {
    console.log(
      `Main acceptor listening on port ${port} in thread ${threadId}`
    );
  });

  for (let index = 0; index < NUM_WORKERS; index++) {
    const worker = new Worker(__filename);

    worker.on("message", (message) => {
      if (message.type === "ready") {
        console.log(`Worker ${message.id} is ready`);
        workers.push(worker);
      }
    });

    worker.on("error", (err) => {
      console.error(`Worker ${index} error:`, err);
      // Remove worker from pool
      const workerIndex = workers.indexOf(worker);
      if (workerIndex !== -1) {
        workers.splice(workerIndex, 1);
      }
    });
  }
} else {
  // Worker thread logic
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    // res.end(`Hello from worker thread ${threadId}!`);
    res.end("Hello World");
  });

  // Listen on a unique port per worker (not actually used for incoming connections)
  // This is just to initialize the server
  server.listen(0, () => {
    console.log(`Worker ${threadId} initialized`);

    // Tell the main thread we're ready
    parentPort.postMessage({
      type: "ready",
      id: threadId,
    });
  });

  // Handle connection handoffs from the main thread
  parentPort.on("message", (message) => {
    if (message.type === "connection") {
      // Create a new socket from the file descriptor
      const socket = new net.Socket({ fd: message.fd });

      // Add it to the server
      socket.resume();
      server.emit("connection", socket);
    }
  });
}
