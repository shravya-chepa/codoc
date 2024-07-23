const mongoose = require("mongoose");
require('dotenv').config();

const Document = require("./models/document.model.js")


const encodedPassword = encodeURIComponent(process.env.DB_PWD);
mongoose
  .connect(
    `mongodb+srv://shravyachepa:${encodedPassword}@documents.n4nf63o.mongodb.net/?retryWrites=true&w=majority&appName=Documents`
  )
  .then(() => {
    console.log("connected to the database");
  })
  .catch((error) => {
    console.log("connection failed", error);
  });

const io = require("socket.io")(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const defaultValue = ""

io.on("connection", (socket) => {
  socket.on("get-document", async (documentId) => {
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId); // setting clients to a room
    socket.emit("load-document", document.data);
    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    socket.on("save-document", async data => {
      await Document.findByIdAndUpdate(documentId, {data})
    })
  });
  console.log("connected");
});


async function findOrCreateDocument(id) {
    if (id== null) return

    const document = await Document.findById(id);
    if (document) return document;
    return await Document.create({_id: id, data: defaultValue})
}