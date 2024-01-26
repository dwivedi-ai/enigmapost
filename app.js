if (process.env.NODE_ENV!=="production")
{
  require('dotenv').config();
}
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const User = require('./models/users.js');
const Follower = require('./models/followers.js');
const Following = require('./models/following.js');
const UserBio = require('./models/userBio.js');
const Post = require('./models/post.js');
const alert = require('alert');
const session = require('express-session');
const multer = require('multer');
const {storage} = require("./cloudinary/index.js");
const upload = multer({storage});
const server = require('http').Server(app);
const io = require('socket.io')(server)
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/enigmapost';
// var ttl = require('mongoose-ttl');
const {cloudinary} = require('./cloudinary/index.js');
const compression = require('compression');
const ColorThief = require('colorthief');
const Personal = require('./models/personal.js')
const { v4: uuidV4 } = require('uuid')
const MongoStore = require('connect-mongo')(session)
const Likes = require('./models/likes.js');
// Configuring mongoose

mongoose.connect(dbUrl, {useNewUrlParser: true, useUnifiedTopology: true})
.then(() =>{
    console.log('Connection Open');
})
.catch(err =>{
    console.log("Oh No, Connection Error")
    console.log(err)
})

// Middleware
const store = new MongoStore({
  url: dbUrl,
  secret: "CreatedByAnkitDwivedi",
  touchAfter: 24 * 60 * 60
})

store.on("error", (e)=>{
  console.log("Error: ",e);
})


const sessionConfig = {
  store: store,
  name: 'session',
  secret: 'CreatedByAnkitDwivedi',
  resave: false,
  saveUninitialized: true,
}
const requireLogin = (req, res, next) => {
    if (!req.session.user_id && !req.session.userBio_id) {
        return res.redirect('/login')
    }
    next();
}

// Setting the app
app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));


//Using app

app.use(compression({
  level: 6
}))
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use(session(sessionConfig));

// Breaks

// Post Routes
app.post('/register', async (req,res)=>{
  const {username,firstname,lastname,email,password}= req.body;
  const hash = await bcrypt.hash(password, 12);
  const alreadyThere = await User.findOne({$or:[ {username},{email} ]});
  if (alreadyThere!=null)
  {
    alert("Username or Email Already Exists, try another one");
    res.redirect('/register')
  }else{
    const image = '../images/user-tie-solid.svg';
    const userBio= new UserBio({username,firstname,lastname,email,bio:'',website:'',profilePic:image,acType: 'standard',picName:'default'});
    userBio.save()
    const user = new User({username,firstname,lastname,email,password:hash, acType: 'standard'});
    user.save()
    .then(()=>{

      req.session.userBio_id = userBio._id;
      req.session.user_id = user._id;
      res.redirect('/post/')
    })
    .catch(e=>{
      alert("Oops! An error occured");
      res.redirect('/register');
    })
  };
});


app.post('/posting', requireLogin, upload.single('post'), async (req,res)=>{
  const user = await UserBio.findById(req.session.userBio_id);
  var d = new Date();
  var n = d.toUTCString();
  await cloudinary.image(req.file.filename, {quality: "auto"})
  const post = new Post({image:req.file.path,imageName:req.file.filename, username:user.username,date:n,caption:req.body.caption, bg:req.body.bg, likesCount: 0})
  await post.save();
  res.redirect('/post/');
})

app.get('/search', requireLogin, async (req,res)=>{

  const search = req.query.search;
  const id = req.session.userBio_id;
  data = await UserBio.findById(id);
  if (search) {
       const regex = new RegExp(search, 'gi');
       const users = await UserBio.find({$or : [
         {firstname: regex},
         {username: regex},
         {lastname:regex},
         {email: regex}
    ]})

        res.render('search.ejs', {data,
               users,me:data
             })
           }
});

app.get('/register', (req,res)=>{
  res.render("register");
});

app.get('/login', (req,res)=>{
  res.render("login");
});

app.post('/login', async(req,res)=>{
  const {username, password}=req.body;
  const u = await User.findOne({username});
  const userBio = await UserBio.findOne({username});
  if (u!=null && userBio!=null)
  {
  const validPass = await bcrypt.compare(password, u.password);
  if (validPass)
  {
    req.session.user_id = u._id;
    req.session.userBio_id = userBio._id;
    res.redirect('/post/');
  }else{
    alert("Oops! Incorrect Username or Password");
    res.redirect(`/login`);
  }
}else{
  alert("Oops! Incorrect Username or Password");
  res.redirect(`/login`);
}
})

app.get('/', (req,res)=>{
  if(!req.session.user_id)
  {
    res.render('home.ejs');
  }else{
    res.redirect('/profile/'+req.session.userBio_id)
  }
});
app.get('/home',(req,res)=>{
  res.render('home')
})



app.get('/profile/:id',requireLogin, async(req,res)=>{

  const id = req.params.id;
  var ndata = true;
  
  if(id==req.session.userBio_id)
  {
    ndata = true;
  }else{
    ndata = false;
  }
  me = await UserBio.findById(req.session.userBio_id);
  
  const data = await UserBio.findById(id);
  flwrs = await Follower.find({username: data.username});
  flwing = await Following.find({username: data.username});
  isflwing = await Following.findOne({$and:[{following: data.username}, {username: me.username}]});
  var isFollowing = false;
  var isBack = false
  if(isflwing!=null)
  {
    isFollowing=true
  }
  var isback = await Follower.findOne({$and:[{follower: data.username}, {username: me.username}]});
  if(isback!=null)
  {
    isBack=true
  }
  const followers = flwrs.length;
  const following = flwing.length;
  var posts = await Post.find({username:data.username});
  var likes = [];
  var likers = [];
  for (post of posts)
  {
    likes = likes.concat(await Likes.find({postId: post._id}));
    likers = likers.concat([{
      postId: post._id, 
      likes: (await Likes.find({postId: post._id})).length
    }])
  }
  res.render('profile', {data, followers, following, ndata, isFollowing, me, isBack, posts, likes:likers});
});


app.get('/edit', requireLogin, async(req, res)=>{
  id = req.session.userBio_id;
  data = await UserBio.findById(id);

  res.render('profileEdit', data);
})
// function ping() {
//   var date = new Date();
//   var year = date.getFullYear();
//   var month = date.getMonth() + 1;
//   var day = date.getDate();
//   var hour = date.getHours();
//   var min = date.getMinutes();
//   var sec = date.getSeconds();
//   console.log(day + ':' +month +':'+year);
//   console.log(hour+':'+min+':'+sec);
// }
// setInterval(ping, 1000);
app.post('/edit', requireLogin, async(req, res)=>{
  var {username, firstname, lastname, email, website, bio} = req.body;
  id = req.session.userBio_id;
  uid = req.session.user_id;
  const preUser = await UserBio.findOne({_id: id});
  const alreadyThere = await User.findOne({$or:[ {username:username},{email: email} ]});
  if (alreadyThere!==null)
  {
    if (alreadyThere.username != preUser.username)
    {
      alert("Username or Email Already Exists, try another one");
      res.redirect('/edit')
    }else{
      if (alreadyThere.email != preUser.email)
      {
        alert("Username or Email Already Exists, try another one");
        res.redirect('/edit')
      }else{

            await Follower.updateMany({username: preUser.username},{username: username});
            await Follower.updateMany({follower: preUser.username},{follower: username});

            await Following.updateMany({username: preUser.username},{username: username});
            await Following.updateMany({following: preUser.username},{following: username});
            await UserBio.findByIdAndUpdate(id, {username:username,firstname:firstname,lastname:lastname,email:email,bio:bio,website:website});
            await User.findByIdAndUpdate(uid, {username:username,firstname:firstname,lastname:lastname,email:email});
            res.redirect('/profile/'+id)
      }
    }
  }else{

    await Follower.updateMany({username: preUser.username},{username: username});
    await Follower.updateMany({follower: preUser.username},{follower: username});

    await Following.updateMany({username: preUser.username},{username: username});
    await Following.updateMany({following: preUser.username},{following: username});
    await UserBio.findByIdAndUpdate(id, {username:username,firstname:firstname,lastname:lastname,email:email,bio:bio,website:website});
    await User.findByIdAndUpdate(uid, {username:username,firstname:firstname,lastname:lastname,email:email});
    res.redirect('/profile/'+id)
}
})
app.post('/editdp', requireLogin, upload.single('propic'), async(req, res)=>{

  id = req.session.userBio_id;
  var checkDP = await UserBio.findById(id);
  if (checkDP.picName != 'default')
  {
    await cloudinary.uploader.destroy(checkDP.picName);
  }
  cloudinary.image(req.file.filename, {quality: "auto"})
  await UserBio.findByIdAndUpdate(id, {profilePic:req.file.path,picName:req.file.filename});
  res.redirect('/profile/'+id);
})

app.get('/logout', requireLogin, (req,res)=>{
  req.session.user_id=null;
  req.session.userBio_id=null;
  res.redirect('/login')
})






app.post('/removedp',requireLogin, async(req,res)=>{
  var checkDP = await UserBio.findById(id);
  id = req.session.userBio_id;
  if (checkDP.picName != 'default')
  {
    await cloudinary.uploader.destroy(checkDP.picName);
    await UserBio.findByIdAndUpdate(id, {profilePic:'../images/user-tie-solid.svg',picName:'default'});

  }
  res.redirect('profile/'+id)
})

app.get('/follow/:uname', requireLogin, async (req, res)=>{
  const u = req.params.uname;
  const user = await UserBio.findById(req.session.userBio_id);
  const fws = await UserBio.findOne({username: u});
  const isF = await Follower.findOne({$and:[{follower: user.username},{username: u}]});;
  if (!isF){
    const createFollower = new Follower({username: u, follower: user.username});
    createFollower.save();
    const createFollowing = new Following({following: u, username: user.username});
    createFollowing.save();
    if (user.acType == 'admin')
    {
      await UserBio.findByIdAndUpdate(fws._id, {acType: 'verified'});
    }
    res.redirect(`/profile/${fws._id}`);
  }else{
    await Follower.findByIdAndDelete(isF);
    const isFo = await Following.findOne({$and:[{following: fws.username},{username: user.username}]});
    await Following.findByIdAndDelete(isFo)
    if (user.acType == 'admin')
    {
      await UserBio.findByIdAndUpdate(fws._id, {acType: 'standard'});
    }
    res.redirect(`/profile/${fws._id}`);
  }
});












app.get('/post',requireLogin, async(req,res)=>{
  var posts = [];
  var users = [];
  var likes = [];
  const user = await UserBio.findById(req.session.userBio_id);
  const following = await Following.find({username: user.username});
  for (f of following) {
    users = users.concat(await UserBio.find({username: f.following}))
    posts=posts.concat(await Post.find({username: f.following}));
  }
  var hasLiked = [];
  var likers = [];
  for (post of posts)
  {
    likes = likes.concat(await Likes.find({postId: post._id}));
    likers = likers.concat([{
      postId: post._id, 
      likes: (await Likes.find({postId: post._id})).length
    }])
    var hasme = await Likes.findOne({$and:[{postId: post._id},{username: user.username}]})
    if (hasme!=null){
      hasLiked = hasLiked.concat([{
        postId: post._id,
        haveI: true
      }])
    }else{
      hasLiked = hasLiked.concat([{
        postId: post._id,
        haveI: false
      }])
    }
  }
  res.render('post',{data: user, me: user, posts: posts, users: users, likes:likers, hasLiked});
})




app.get('/createPost',requireLogin, async(req, res)=>{
  const user = await UserBio.findById(req.session.userBio_id);
  res.render('createPost.ejs', {data: user, me:user})
})

// app.get('/followers', async(req,res)=>{
//   const user = await UserBio.findById(req.session.userBio_id);
//   const followers = await Follower.find({username: user.username});
//   var follower = [];
//   for (fl of followers){
//     follower.push(fl.follower);
//   }
//   var actype=[];
//   var fdata=[];
//   for (fl of follower){
//     console.log(fl);
//     fdata.push(await UserBio.find({username: fl}));
//
//   }
//   for (data of fdata){
//
//   }
//   console.log(actype);
//   var index=0;
//   for (a of follower){
//     console.log("Name: "+a+", Type: "+actype[index]);
//     index+=1;
//   }
//   res.render('followers.ejs',{data:user, me:user, followers})
// })

app.post('/createPost',requireLogin, async(req, res)=>{
  const user = await UserBio.findById(req.session.userBio_id);
  res.render('createPost.ejs', {data: user})
})

app.get('/chat',requireLogin,async(req,res)=>{
  const user = await UserBio.findById(req.session.userBio_id);
  const chat = await Personal.find({});
  res.render('chat',{data:user, me:user, chat})
})


app.get('/like/:id', requireLogin, async(req, res)=>{
  const id = req.params.id;
  const user = await UserBio.findById(req.session.userBio_id);
  const like = new Likes({postId: id, username:user.username})
  like.save()
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON. stringify({ a: 1 }));
})

app.get('/unlike/:id', requireLogin, async(req, res)=>{
  const  id = req.params.id;
  const user = await UserBio.findById(req.session.userBio_id);
  const like = await Likes.findOne({$and:[{postId: id}, {username:user.username}]})
  if (like!=null)
  {
    await Likes.findByIdAndDelete(like._id);
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON. stringify({ a: 1 }));
})

io.on('connection', (socket) => {
  socket.on('chat message', (msg) => {
    const chat= new Personal({message: msg.message,username: msg.user});
    chat.save()
    io.emit('chat message', msg);
  });
});

app.get('/videocall',requireLogin, async(req,res)=>{
  const user = await UserBio.findById(req.session.userBio_id);
  res.render('video-chat.ejs',{data:user, me:user})
})

let clients = 0

io.on('connection', function (socket) {
    socket.on("NewClient", function () {
        if (clients < 2) {
            if (clients == 1) {
                this.emit('CreatePeer')
            }
        }
        else
            this.emit('SessionActive')
        clients++;
    })
    socket.on('Offer', SendOffer)
    socket.on('Answer', SendAnswer)
    socket.on('disconnect', Disconnect)
})

function Disconnect() {
    if (clients > 0) {
        if (clients <= 2)
            this.broadcast.emit("Disconnect")
        clients--
    }
}

function SendOffer(offer) {
    this.broadcast.emit("BackOffer", offer)
}

function SendAnswer(data) {
    this.broadcast.emit("BackAnswer", data)
}


server.listen(process.env.PORT || 3000, (req,res)=>{
  console.log("Enigma Post Server has started");
})
