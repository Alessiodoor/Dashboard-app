exports.createDefault = function(Item) {
	// Create default items
	const item1 = new Item ({
	name: "Cosa1"
	});
	const item2 = new Item ({
	name: "Cosa2"
	});
	const item3 = new Item ({
	name: "Cosa3"
	});

	return [item1, item2, item3];
}