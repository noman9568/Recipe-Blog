const mongoose = require('mongoose');

const response = mongoose.Schema({
  name : String,
  email : String,
  message : String,
  username : String
})

module.exports = mongoose.model('response', response);