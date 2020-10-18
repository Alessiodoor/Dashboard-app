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
const TodoList = require(__dirname + "/requires/todolist.js");

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

// Connection to DB, localhost, named dashboardDB
const local_url = "mongodb://localhost:27017/dashboardDB";
mongoose.connect(local_url, {useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false });

let todoList = new TodoList(mongoose);

const userSchema = new mongoose.Schema ({
	email: String,
	password: String,
	googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

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

// route methods

// Home page, check if user is authenticated, of he is save the username
// Next, get all the lists
// And render the Today list, the home 
app.get("/", function(req, res) {
	let userName = "";

	if(req.isAuthenticated()){
		User.findById(req.user.id, function(err, resultUser) {
			if(err){
				console.log(err);
			}else {
				if(resultUser){
					userName = resultUser.username;
				}
			}
		});
	}else {
		console.log('not logged');
	}

	//const day = date.getDate();
	var lists = [];
	todoList.getLists(function(result) {
		lists = result;	
	});

	todoList.getList("Today", function(err, resultList) {
		if(err){
			console.log(err);
		}else {
			if(!resultList){
				//insert default data
				todoList.insertDefaultData(res, function(err) {
					if(!err){
						res.redirect("/");	
					}else {
						console.log(err);
					}
				});
				
			}else{
				res.render('home', {userName: "Prova", listTitle: "Today", listItems: resultList.items, lists: lists});
			}
		}
	});
});

// Insert new item in a list
// the listName is given by a form
app.post("/", function(req, res) {
	const listName = req.body.list;

	todoList.insertNewItem(req.body.newItem, listName, function(saved) {
		if(saved === true){
			res.redirect("/" + listName);
		}
	});
});

// Delete a item from a list
// the listName is given by a form
app.post("/delete", function(req, res) {
	const listName = req.body.listName;

	// find the custom list and remove the item 
	todoList.findOneAndUpdate(listName, req.body.checkbox, function(err, doc) {
		if(!err){
			res.redirect("/" + listName);
		}
	});
});

// Create a newList if is not in the db, than render the customList page
app.post("/newList", function(req, res){
	let listName = _.capitalize(req.body.newList);
	listName = _.replace(listName, ' ', '_');

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

// Rendere login
app.get("/login", function(req, res) {
	res.render("login", {userName: ""});
});

// Login a user, the credentials are given by a form submition
// After the creation and authentication redirect to home page (app.get("/"))
app.post("/login", function(req, res) {
	const newUser = new User ({
		username: req.body.username,
		password: req.body.password
	});

	req.login(newUser, function(err) {
		if(err){
			console.log(err);
		}else {
			// atutentico l'utente con una strategia local, quando ho user sul db
			passport.authenticate("local")(req, res, function() {
				res.redirect("/");
			});
		}
	});
});

// Rendere register page
app.get("/register", function(req, res) {
	res.render("register", {userName: ""});
});

// Create new user, the credentials are given by a form submition
// After the creation the user is authenticated and redirected to the home page (app.get("/"))
app.post("/register", function(req, res) {
	User.register({username: req.body.username}, req.body.password, function(err, user) {
		if(err){
			console.log(err);
			res.redirect("/register");
		}else{
			passport.authenticate("local")(req, res, function() {
				res.redirect("/");
			});
		}
	});
});

// Render a custom list
// get the list name from the url, capitalize it and replace blanks with underscores
// After, get the list from the db and render home 
app.get("/:costumListName", function(req, res) {
	if(req.isAuthenticated()){
		console.log('logged');
	}else {
		console.log('not logged');
	}

	let listName = _.capitalize(req.params.costumListName);
	listName = _.replace(listName, ' ', '_');
	
	// Mostro tutte le liste
	var lists = [];
	todoList.getLists(function(result) {
			lists = result;	
	});

	todoList.getList(listName, function(err, doc) {
		if(!err){
			if(doc){
				res.render("home", {userName: "Prova", listTitle: listName, listItems: doc.items, lists: lists})
			}
		}
	});
}); 

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function(){
	console.log('Running...');
});