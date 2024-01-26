
const mongoose = require('mongoose');

const likes = new mongoose.Schema({
  postId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  }
})
module.exports = mongoose.model('like',likes);
