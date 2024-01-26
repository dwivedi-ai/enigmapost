
const mongoose = require('mongoose');

const posts = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  imageName: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  caption: {
    type: String
  },
  bg:{
    type: String
  },
  likesCount:{
    type: Number
  }
});
module.exports = mongoose.model('Post',posts);
