const mongoose = require("mongoose");


const documentSchema = mongoose.Schema(
  {
    _id: String,
    data: Object
  },
  { timestamps: true }
);

const Document = mongoose.model("Document", documentSchema);

module.exports = Document;