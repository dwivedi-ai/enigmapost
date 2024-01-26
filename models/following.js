
const mongoose = require('mongoose');

const following = new mongoose.Schema({
  following: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  }
})
module.exports = mongoose.model('Following',following);
