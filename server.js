// server.js
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/**
 * streamId -> broadcaster WebSocket
 */
const broadcasters = new Map();
/**
 * streamId -> Set of viewer WebSockets
 */
const viewers = new Map();

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean); // ["ws","broadcast","tesla"]

  if (parts[0] !== "ws") {
    ws.close();
    return;
  }

  const role = parts[1];
  const streamId = parts[2];

  if (!streamId) {
    ws.close();
    return;
  }

  if (role === "broadcast") {
    console.log(`Broadcaster connected: ${streamId}`);
    broadcasters.set(streamId, ws);

    ws.on("message", (data) => {
      const set = viewers.get(streamId);
      if (!set) return;
      for (const client of set) {
        if (client.readyState === client.OPEN) {
          client.send(data);
        }
      }
    });

    ws.on("close", () => {
      console.log(`Broadcaster disconnected: ${streamId}`);
      broadcasters.delete(streamId);
    });
  } else if (role === "view") {
    console.log(`Viewer connected: ${streamId}`);

    let set = viewers.get(streamId);
    if (!set) {
      set = new Set();
      viewers.set(streamId, set);
    }
    set.add(ws);

    ws.on("close", () => {
      set.delete(ws);
      console.log(`Viewer disconnected: ${streamId}`);
    });
  } else {
    ws.close();
  }
});

// 스트림 보는 페이지
app.get("/view/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "viewer.html"));
});

// 정적 파일
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
