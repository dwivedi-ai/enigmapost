
const mongoose = require('mongoose');
// var ttl = require('mongoose-ttl');

const personal = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  }
});
module.exports = mongoose.model('personal',personal);
