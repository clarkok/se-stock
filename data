'use strict';

let config = require('../../config.json');
let db = require('../database/database.js')(config.database);
let Promise = require('bluebird');


//股票代码和收盘价
//queryBid(stock){
	//暂定
//}


function queryCancellable(id){
	return db.getInstructionById(id).then((insts) => {
		if (insts.amount != insts.original &&　insts.is_cancelled == 1){ 
			return Promise.resolve(false);
		}
		else{
			return Promise.resolve(true);
		};	
	});
}


function queryAccount(id){
	return db.getInstructionById(id).then((insts) => {
			return Promise.resolve(insts.owner);     
	});
}


function insertIns(owner, stock, price, amount, is_buying){
	if(is_buying){
		return db.commitBuyingInstruction(owner, stock, price, amount);
	}
	else{
		return db.commitSellingInstruction(owner, stock, price, amount);
	}
}




function recallIns(id){
	return db.cancelInstruction(id);			
}



//dealIns{//不需要
	

function insertDeal(buying_id, selling_id, amount,price){
	return makeTrade(buying_id, selling_id, amount,price);
}


//savePrice{
	//暂定
//}
