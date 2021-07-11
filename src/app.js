const express = require("express");
const process = require("child_process");
const bodyParser = require("body-parser");
const cors = require("cors");
const socketIo = require("socket.io");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const rfb = require("rfb2");
const Pty = require("node-pty");

const { fstat } = require("fs");
const fs = require("fs");
const { Buffer } = require("buffer");
const rmdir = require("rimraf");

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});
app.use(bodyParser.urlencoded({ extended: true }));

let sessionId = "";

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

const port = 3000;

const available_docker = [];
let clients = [];

const buildCmd = (sessid) =>
  `docker build -t ${sessid} . --build-arg sessid=${sessid}`;
const runCmd = (sessid) => `docker run ${sessid}`;

const addEventHandlers = (r, socket) => {
  r.on("connect", function () {
    socket.emit("init", {
      width: r.width,
      height: r.height,
    });
    clients.push({
      socket: socket,
      rfb: r,
    });
  });
  r.on("rect", function (rect) {
    // handleFrame(socket, rect, r);
  });
};

const handleFrame = async (socket, rect, r) => {
  let rgb = new Buffer.allocUnsafe(rect.width * rect.height * 3, "binary");
  let offset = 0;

  for (var i = 0; i < rect.data.length; i += 4) {
    rgb[offset++] = rect.data[i + 2];
    rgb[offset++] = rect.data[i + 1];
    rgb[offset++] = rect.data[i];
  }

  // let image = new PNG.sync.read(rect.data);

  // image = image.encodeSync();
  // socket.emit("frame", {
  //   x: rect.x,
  //   y: rect.y,
  //   width: rect.width,
  //   height: rect.height,
  //   image: image.toString("base64"),
  // });

  // image = image.toString("base64");
  // socket.emit("frame", {
  //   x: rect.x,
  //   y: rect.y,
  //   width: rect.width,
  //   height: rect.height,
  //   image: image,
  // });
};

const createRfbConnection = (config, socket) => {
  let r = rfb.createConnection({
    host: "localhost",
    port: 5901,
    password: "vncpassword",
  });
  addEventHandlers(r, socket);
  return r;
};

io.on("connection", (socket) => {
  console.log("connection established");

  socket.emit("connection:sid", socket.id);

  socket.on("session", (data) => {
    const codeObject = JSON.parse(data);
    if (codeObject.sessid === undefined) return;
    const code = codeObject.code;
    const sessid = codeObject.sessid;
    const language = codeObject.language;
    const languageExt = codeObject.languageExt;
    const mainEntry = codeObject.mainEntry;

    const dir = `src/${language}/src/${sessid}`;

    fs.mkdir(dir, { recursive: true }, (x) => {
      fs.writeFile(`${dir}/${mainEntry}.${languageExt}`, code, (err) => {
        if (err) console.log(err);
      });
    });

    socket.emit("running", true);

    sessionId = uuidv4();

    //docker build -f src/Java/Dockerfile -t asdfasdf . --build-arg sessid=asdfasdf --build-arg main=HelloWorld
    process.exec(
      `docker build -f src/${language}/Dockerfile -t ${sessid} . --build-arg sessid=${sessid} --build-arg main=${mainEntry}`,
      function (error, stdout, stderr) {
        if (error) {
          console.log("error", stdout);
          console.log("error", stderr);
          console.log("sth went wrong here")
          socket.emit("error", stdout);
          socket.emit("close");
          // console.log("stderror", stderr);
        } else {
          // const javaRun = process.spawn(
          //   `docker run --name ${sessionId} --stop-timeout 30 ${sessid}`,
          //   [],
          //   { shell: true }
          // );

          let processclient = Pty.spawn("docker", ["run", "-it", "--name", `${sessionId}`, "--stop-timeout", "30", `${sessid}`], {
            name: "xterm-color",
            cols: 80,
            rows: 24,
            env: process.env,
          });

          // processclient.write(
          //   `docker run --name ${sessionId} --stop-timeout 30 ${sessid} \r`
          // );

          processclient.onData((data) => {
            console.log(data);
            socket.emit("output", data);
          });

          socket.on("input", (data) => {
            console.log(data)
            processclient.write(data);
          })

        //   socket.on("disconnect", function(){
        //     processclient.destroy();
        //     console.log("bye");
        //  });

          // javaRun.stderr.on("data", function (data) {
          //   // console.log(data.toString());
          //   socket.emit("error", data);
          // });

          // if (socketId) {
          //   io.sockets.in(socketId).on("input", (input) => {
          //     console.log(input);
          //   });
          // }

          // javaRun.stdout.on("data", function (data) {
          //   // console.log(data.toString());
          //   socket.emit("output", data);
          // });

          processclient.onExit("close", () => {
            rmdir(dir, function (error) {
              console.log(error);
            });
            socket.emit("close");
          });
          // javaRun.on("close", () => {
          //   rmdir(dir, function (error) {
          //     console.log(error);
          //   });
          //   socket.emit("close");
          //   return;
          // });
        }
      }
    );
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.post("/stop", (req, res) => {
  if (req.body.sessid === undefined) return;

  const sessid = req.body.sessid;
  console.log("getting stopped");
  process.exec(`docker kill ${sessionId}`, (err, stdout, stderr) => {
    if (err) {
      res.send(stderr);
      return;
    }
    res.send(stdout);
  });
});

app.post("/session", (req, res) => {
  if (req.body.sessid === undefined) return;
  const code = req.body.code;
  const sessid = req.body.sessid;
  const language = req.body.language;
  const languageExt = req.body.languageExt;
  const mainEntry = req.body.mainEntry;
  const socketId = req.body.socketId;

  const dir = `src/${language}/src/${req.body.sessid}`;

  fs.mkdir(dir, { recursive: true }, (x) => {
    fs.writeFile(`${dir}/${mainEntry}.${languageExt}`, code, (err) => {
      if (err) console.log(err);
    });
  });
  //docker build -f src/Java/Dockerfile -t asdfasdf . --build-arg sessid=asdfasdf --build-arg main=HelloWorld
  //docker run --name asdfasdf --stop-timeout 30 --memory="134217728" asdfasdf
  sessionId = uuidv4();
  console.log(socketId);
  process.exec(
    `docker build -f src/${language}/Dockerfile -t ${sessid} . --build-arg sessid=${sessid} --build-arg main=${mainEntry}`,
    function (error, stdout, stderr) {
      if (error) {
        res.send(stderr);
        console.log(error);
      } else {
        console.log("hello");
        const javaRun = process.spawn(
          `docker run --name ${sessionId} --stop-timeout 30 --memory="134217728" ${sessid}`,
          [],
          { shell: true }
        );
        if (socketId) {
          io.to(socketId).emit("running", true);
        }

        javaRun.stderr.on("data", function (data) {
          if (socketId) {
            // console.log(data.toString());
            io.to(socketId).emit("error", data.toString());
          }
        });

        if (socketId) {
          io.sockets.in(socketId).on("input", (input) => {
            console.log(input);
          });
        }

        javaRun.stdout.on("data", function (data) {
          console.log(data.toString());
          if (socketId) {
            io.to(socketId).emit("output", data.toString());
          }
        });

        javaRun.on("close", () => {
          rmdir(dir, function (error) {
            console.log(error);
          });
          res.send("done");
          return;
        });
      }
    }
  );
});

module.exports = server;
