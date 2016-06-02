class InsOperate{
	function buy(token, code, amount, price){
		Account.freezeMoney(token)
		Data.insertIns(token, code, amount, price, true)
		var id = Trade.pushBuy(token, code, amount, price)
		return id
	}

	function sell(token, code, amount, price){
		Account.freezeMoney(token)
		Data.insertIns(token, code, amount, price, false)
		var id = Trade.pushBuy(token, code, amount, price)
		return id
	}

	function recallBuy(token, id){
		Data.recallIns(id)
		Trade.rmoveBuyer(id)
		Account.defreezeMoney(token)
	}

	function recallSell(token, id){
		var stock = Data.queryStockCode(id)
		Data.recallIns(id)
		Trade.rmoveSeller(id)
		Account.defreezeBond(token, stock)
	}
}