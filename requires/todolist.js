const mongoose = require("mongoose");

// Create schemas
exports.getItemSchema = function(mongoose){
	return new mongoose.Schema({
		name: {
			type: String,
			required: [true, "Specifie a name"]
		}
	});
}

exports.getListSchema = function(mongoose){
	return new mongoose.Schema ({
		name: {
			type: String,
			require: true
		},
		items: [itemSchema]
	});
}

exports.getLists = function(List, fn){
	List.find({}, function(err, results) {
		if(!err){
			if(results){
				fn(results);	
			}
		}
	});
}

exports.insertDefaultData = function(List, defaultItems, res){
	const todayList = new List({
		name: "Today",
		items: defaultItems
	});

	todayList.save(function(err) {
		if(err){
			console.log(err);
			return false;
		}else {
			return true;
		}
	});
}

exports.insertNewItem = function(itemName, listName, List, Item, fn){
	const item = new Item({
		name: itemName
	});

	// cerco la lista custom e ci aggiungo l'item
	List.findOne({name: listName}, function(err, doc) {
		var saved;
		if(!err){
			doc.items.push(item);
			doc.save(function() {
				fn(true);
			});
		}else{
			console.log(err);
		}
		
	});
}