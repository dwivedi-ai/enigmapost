
const mongoose = require('mongoose');

const followerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  follower: {
    type: String,
    required: true
  }
})
module.exports = mongoose.model('Follower',followerSchema);
