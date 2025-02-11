const mongoose = require('mongoose');

const recipeData = mongoose.Schema({
  title : { type: String},
  description : { type: String },
  ingredients : [String],
  image : {
    data : Buffer,
    contentType: String,
  },
  comments : [String],
  likes : { type: Number, default: 0 },
  likedBy : { type: [String]},
  category : { type: String },
  username : { type:String , Required: true },
})

module.exports = mongoose.model('recipeData',recipeData);