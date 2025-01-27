const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const mongoose = require('mongoose');

const userDetails = require('./models/userDetails');
const recipeData = require('./models/recipeData');
const MONGO_URI = process.env.MONGO_URI;
const isAuthenticated = require('./middlerware/auth');

require('dotenv').config();

mongoose.connect('mongodb+srv://nomanhussain110504:lw0Idcc3tDXrmUiL@testing.pplfu.mongodb.net/?retryWrites=true&w=majority&appName=Testing')


app.set("view engine","ejs");


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended : true}));
app.use(session({
  secret: 'nothing',
  resave : false,
  saveUninitialized : false,
  cookie : { maxAge : 60*10*1000 }
}))

app.use(express.json());


app.get('/',(req,res)=>{
  return res.render('login');
})

// handing login request from the browser
app.post('/login',upload.none(),async (req,res)=>{
  const { username, password } = req.body;
  const user = await userDetails.findOne({username : username});
  if(user) {
    const check = await comparePassword(password,user.password);
    if(check) {
      req.session.username = username;
      const userD = await userDetails.findOneAndUpdate({username : username}, { isActive : true }, { new: true });
      return res.status(200).json('Login Successfull.');
    }
    else {
      return res.status(401).json({message : 'Wrong Password!'});
    } 
  }
  else {
    return res.status(404).json({message : "User Doesn't exist!"});
  }
})


// handing register request from the browser
app.post('/register',upload.none(),async (req,res)=>{
  const { name, email,username, phone , password } = req.body;
  const checkUser = await userDetails.findOne({username});
  if(checkUser) {
    return res.status(409).json({message : 'Username Already exists!'});
  }
  // console.log(req.body);
  const Hpassword = await hashPassword(password);
  const user = await userDetails.create({
    name,
    email,
    username,
    password : Hpassword,
    isActive : false,
    phone
  })
  // console.log(user);
  return res.status(200).json({message : 'Registered Successfully!'});
})


// Password Hashing
async function hashPassword(enterPassword) {
  const saltRounds = 8;
  const hashP = await bcrypt.hash(enterPassword,saltRounds);
  return hashP;
}


// Comparing password for authentication
async function comparePassword(enter,hash) {
  const check = await bcrypt.compare(enter,hash);
  return check;
}

app.get('/home',isAuthenticated,async (req,res)=>{
  const user = await userDetails.findOne({username : req.session.username}).select('name');
  const recipeIndian = await recipeData.find({category : 'Indian'}).select('title image _id');
  const recipeAmerican = await recipeData.find({category : 'American'}).select('title image _id');
  const recipeChinese = await recipeData.find({category : 'Chinese'}).select('title image _id');
  return res.render('home' , {username : req.session.username , recipeIndian , recipeAmerican , recipeChinese , name : user.name});
})

app.get('/image/:id',async (req,res)=>{
  const recipe = await recipeData.findById(req.params.id);
  res.contentType(recipe.image.contentType);
  res.send(recipe.image.data);
})

app.get('/addRecipe',async (req,res)=>{
  const user = await userDetails.findOne({username : req.session.username}).select('name');
  return res.render('addRecipe',{username: req.session.username , name : user.name});
})

app.post('/addRecipe',isAuthenticated,upload.single('image'),async (req,res)=>{
  // console.log(req.body);
  // console.log(req.file);
  const image = req.file;
  const { title , description , ingredients , category } = req.body;
  const newRecipe = await recipeData.create({
    title,
    description : description,
    ingredients : ingredients,
    image : {
      data : image.buffer,
      contentType : image.mimetype,
    },
    category : category,
    username : req.session.username,
  })
  return res.redirect('/home');
})

app.get('/view/:id',isAuthenticated,async (req,res)=>{
  const user = await userDetails.findOne({username : req.session.username}).select('name');
  const recipe = await recipeData.findById(req.params.id);
  const liked = recipe.likedBy.includes(req.session.username);
  // console.log(recipe.comments);
  return res.render('view',{username: req.session.username , recipe, likes : recipe.likes, liked , comment : recipe.comments , name: user.name});
})

app.post('/like/:id',async (req,res)=>{
  const likes = await recipeData.findByIdAndUpdate(req.params.id , {$inc : {likes : 1}, $push: {likedBy : req.session.username} } ,{new : true});
  // console.log(likes.likedBy);
  res.json({success : true, likes : likes.likes});
})

app.post('/unlike/:id',async (req,res)=>{
  const likes = await recipeData.findByIdAndUpdate(req.params.id , {$inc : {likes : -1}, $pull: {likedBy : req.session.username} }, {new : true});
  // console.log(likes.likedBy);
  res.json({success : true, likes : likes.likes});
})

app.post('/comment/:id',async (req,res)=>{
  const comment = await recipeData.findByIdAndUpdate(req.params.id , { $push: {comments : req.body.comment} }, {new : true});
  res.json({comment});
})

app.get('/logout',async (req,res)=>{

  try{
    if(!req.session.username){
      console.log('No session to destroy.');
      return res.redirect('/');
    }
    const user = await userDetails.findOneAndUpdate({username : req.session.username} , {isActive : false}, {new : true});
    if(!user){
      console.log('User not found or update failed!');
      return res.status(404).send("User not found.");
    }


    req.session.destroy((err)=>{
      if(err){
        console.log("Failed to destroy the session.");
        return res.redirect('/home');
      }
      return res.redirect('/');
    })
  }
  catch(err){
    console.log("Error during logout : " + err);
    res.status(500).send("An error occurred. Please try again later.");
  }

})

app.get('/yourRecipe',isAuthenticated,async (req,res)=>{
  const user = await userDetails.findOne({username : req.session.username}).select('name');
  const recipe = await recipeData.find({username : req.session.username}).select('title description ingredients');
  // console.log(recipe);
  return res.render('yourRecipe',{username: req.session.username , name : user.name , recipe});
})


app.listen(3000,()=>{
  console.log('Server running on server 3000.');
})