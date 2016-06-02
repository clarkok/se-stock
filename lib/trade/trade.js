'use strict';

let Database = require('../database/database.js');

class Trade {
    constructor(config) {
        this.database = Database(config.database);
    }
	
	test(){
		this.database.getAllSellingInstructions("12345")
			.then((insts) => {
				console.log(insts.length);
			});
		
	}
	
	pushBuyer(stock_id){
		this.check(stock_id).then(result){
			if (result) deal(stock_id, result);
		}
	}
	
	pushSeller(stock_id){
		this.check(stock_id).then(result){
			if (result) deal(stock_id, result);
		}
	}
	
	check(stock_id){
		return this.database.getAllSellingInstructions(stock_id)
			.then((selling_insts) => {
				if (selling_insts.length == 0) return Promise.resolve([]);
				else 
					return this.database.getAllBuyingInstructions(stock_id)
						.then((buying_insts) => {
							if (buying_insts.length == 0) return Promise.resolve([]);
							let result = [];
							let pSell = 0;
							let pBuy = 0;
							let nSell = selling_insts.length;
							let nBuy = buying_insts.length;
							
							while (1){
								while (pSell < nSell && selling_insts[pSell].amount == 0) pSell++;
								while (pBuy < nBuy && buying_insts[pBuy].amount == 0) pBuy++;
								if (pSell == nSell || pBuy == nBuy) break; 
								
								if (selling_insts[pSell].price <= buying_insts[pBuy].price){
									let amount = 0;
									if (selling_insts[pSell].amount < buying_insts[pBuy].amount)
										amount = selling_insts[pSell].amount;
									else
										amount = buying_insts[pBuy].amount;
									
									selling_insts[pSell].amount -= amount;
									buying_insts[pBuy].amount -= amount;
									
									let price = 0;
									if (selling_insts[pSell].time < buying_insts[pBuy].time)
										price = selling_insts[pSell].price;
									else 
										price = buying_insts[pBuy].price;
									result.push([buying_insts[pBuy].id, selling_insts[pSell].id, amount, price]);
								} else break;
							}
							return Promise.resolve(result);
						});
			});
	}
	
	deal(stock_id, data){
		//还没写，data就是调用database一条一条地达成交易
	}
	
	getDatabase(){
		return this.database;
	}
}

module.exports = function (config_database) {

    return new Trade(config_database);
}

