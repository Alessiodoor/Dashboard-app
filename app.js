require('dotenv').config()

const express = require("express");
const bodyParser = require("body-parser");
//const date = require(__dirname + "/date.js"); // modulo locale
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

//local requires
const defaultList = require(__dirname + "/requires/default.js");

// Define application
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// per ogni tipo di autenticazione, anche non locale
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Connection to DB
const local_url = "mongodb://localhost:27017/dashboardDB";
mongoose.connect(local_url, {useUnifiedTopology: true, useNewUrlParser: true});

// Create schemas
const itemSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, "Specifie a name"]
	}
});

const listSchema = new mongoose.Schema ({
	name: {
		type: String,
		require: true
	},
	items: [itemSchema]
});

const userSchema = new mongoose.Schema ({
	email: String,
	password: String,
	googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const Item = new mongoose.model("Item", itemSchema);
const List = new mongoose.model("List", listSchema);
const User = new mongoose.model("User", userSchema);

// Initialize google login API
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

const defaultItems = defaultList.createDefault(Item);

app.get("/", function(req, res) {
	//const day = date.getDate();
	// Mostro tutte le liste
	let lists = [];
	List.find({}, function(err, results) {
		if(!err){
			lists = results;
		}
	});

	List.findOne({name: "Today"}, function(err, resultList) {
		if(err){
			console.log(err);
		}else {
			if(!resultList){
				//insert default data
				const todayList = new List({
					name: "Today",
					items: defaultItems
				});

				todayList.save(function(){
					res.redirect("/");
				});
			}else{
				res.render('home', {listTitle: "Today", listItems: resultList.items, lists: lists});
			}
		}
	});
});

app.post("/", function(req, res) {
	const itemName = req.body.newItem;
	const listName = req.body.list;

	const item = new Item({
		name: itemName
	});

	// cerco la lista custom e ci aggiungo l'item
	List.findOne({name: listName}, function(err, doc) {
		if(!err){
			doc.items.push(item);
			doc.save();
			res.redirect("/" + listName);
		}
	});
});

app.post("/delete", function(req, res) {
	const checkedItemId = req.body.checkbox;
	const listName = req.body.listName;

	// find the custom list and remove the item 
	List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, doc) {
		if(!err){
			res.redirect("/" + listName);
		}
	});
});

app.post("/newList", function(req, res){
	const listName = _.capitalize(req.body.newList);

	List.findOne({name: listName}, function(err, resultList) {
		if(err){
			console.log(err);
		}else {
			if(!resultList){
				const list = new List({
					name: listName,
					items: defaultItems
				});

				list.save();
			}
			res.redirect("/" + listName);
		}
	});
});

app.get("/:costumListName", function(req, res) {
	const listName = _.capitalize(req.params.costumListName);

	// Mostro tutte le liste
	let lists = [];
	List.find({}, function(err, results) {
		if(!err){
			lists = results;
		}
	});

	List.findOne({name: listName}, function(err, doc) {
		if(!err){
			if(doc){
				res.render("home", {listTitle: listName, listItems: doc.items, lists: lists})
			}
		}
	});
}); 

app.get("/about", function(req, res) {
	res.render("about");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function(){
	console.log('Running...');
});