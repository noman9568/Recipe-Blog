const mongoose = require('mongoose');

const User = mongoose.Schema({
  name : String,
  email : String,
  username : String,
  password : String,
  phone : Number,
  isActive : Boolean,
  role : { type : String, default : 'user' }
})

module.exports = mongoose.model('User_Details',User);