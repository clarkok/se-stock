class InsAnalyze{
	function buy(token, code, amount, price){
		if (Data.queryBid(code, price) == false)
			return {state: 'error', info: 'Price out of limit'}
		if (Account.checkMoney(token) == 'error')
			return {state: 'error', info: 'Not enough money'}
		var id = InsOperate.buy(token, code, amount, price)
		return {state: 'ok', info: id}
	}

	function sell(token, code, amount, price){
		if (Data.queryBid(code, price) == false)
			return {state: 'error', info: 'Price out of limit'}
		if (Account.checkBond(token, code) == 'error')
			return {state: 'error'，info: 'Not enough bond'}
		var id = InsOperate.sell(token, code, amount, price)
		return {state: 'ok', info: id}
	}

	function recallBuy(token, id){
		if (queryCancellable(id) == false)
			return {state: 'error', info: 'Can not recall'}
		InsOperate.recallBuy(token, id)
		return {state: 'ok'}
	}

	function recallSell(token, id){
		if (queryCancellable(id) == false)
			return {state: 'error', info: 'Can not recall'}
		InsOperate.recallSell(token, id)
		return {state: 'ok'}
	}
}