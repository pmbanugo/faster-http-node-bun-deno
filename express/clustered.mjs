import express from "express";
import cluster from "cluster";
const numCPUs = navigator.hardwareConcurrency;

if (cluster.isPrimary) {
  console.log(`Master process ${process.pid} is running`);

  // Fork workers equal to CPU cores
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // Optionally restart the worker
    cluster.fork();
  });
} else {
  // Workers share the same port
  const app = express();
  const port = process.env.PORT || 4000;
  let i = 0;

  app.get("/", (req, res) => {
    res.send(`Hello World! ${process.pid}
    `);
  });

  app.listen(port, () => {
    console.log(`Express server listening on port ${port}`);
  });
}
