
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  firstname: {
    type: String,
    required: true
  },
  lastname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  bio: {
    type: String
  },
  website:{
    type: String
  },
  profilePic:{
    type: String,
    required: true
  },
  picName:{
    type: String,
    required: true
  },
  acType: {
    type: String,
    required: true
  }
})
module.exports = mongoose.model('Userbio',userSchema);
