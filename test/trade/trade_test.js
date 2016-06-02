'use strict';

let Trade = require('../../lib/trade/trade.js');
let config = require('../../config.json');


let trade = Trade(config);

/*
trade.getDatabase()
	.commitBuyingInstruction(11, "12345", 10, 100)
	.then((stock) => {
		console.log("buying: " + stock);
	});
	
trade.getDatabase()
	.commitSellingInstruction(22, "12345", 9.8, 100)	
	.then((stock) => {
		console.log("selling: " + stock);
	});


trade.getDatabase()
	.commitSellingInstruction(33, "12345", 11, 100)	
	.then((stock) => {
		console.log("selling: " + stock);
	});
	
trade.getDatabase()
	.commitSellingInstruction(33, "12345", 11.1, 100)	
	.then((stock) => {
		console.log("selling: " + stock);
	});

trade.getDatabase()
	.commitBuyingInstruction(44, "12345", 11.1, 150)
	.then((stock) => {
		console.log("buying: " + stock);
	});
*/

trade.check("12345")
	.then((data) => {
		console.log(data);
	});
	