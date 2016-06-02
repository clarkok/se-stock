'use strict';

let config = require('../../config.json');
let db = require('../database/database.js')(config.database);
let Promise = require('bluebird');

function checkMomey(token){												//查看用户余额：传入token，返回用户余额或错误信息
	var FromData = require('form-data');
	var data = new FromData();
	data.append('token', token);
	return fetch(HOSTNAME + '/capital/check',{method:'POST',body:data})
		.then((res) => res.json())
		.then((data) => {
			if(data.state == 'ok')
				return Promise.resolve(data.amount);
			else if(data.state == 'error')
				return Promise.reject(data.info);
		});	
}														


function checkBond(token,code){										//查看用户证券数量：传入token，股票code，返回用户证券数量或错误信息
	var FromData = require('form-data');
	var data = new FromData();
	data.append = ('token',token);
	data.append = ('code',code);
	return fetch( HOSTNAME + '/stock/check',{method:'POST',body:data})
		.then((res) => res.json())
		.then((data) => {
			if(data.state == 'ok')
				return Promise.resolve(data.amount);
			else if(data.state == 'error')
				return Promise.reject(data.info);
		});
}


function freezeBond(token,code){														//冻结某一证券：传入token，股票code，返回true或错误信息
	var FromData = require('form-data');
	var data = new FromData();
	data.append = ('token',token);
	data.append = ('code',code);
	return fetch( HOSTNAME + '/stock/freeze',{method:'POST',body:data})
		.then((res) => res.json())
		.then((data) => {
			if(data.state == 'ok')
				return Promise.resolve(true);
			else if(data.state == 'error')
				return Promise.reject(data.info);
		});
}


function freezeMoney(token){														//冻结用户资金：传入token，返回true或错误信息
	var FromData = require('form-data');
	var data = new FromData();
	data.append = ('token',token);
	return fetch( HOSTNAME + '/capital/freeze',{method:'POST',body:data})
		.then((res) => res.json())
		.then((data) => {
			if(data.state == 'ok')
				return Promise.resolve(true);
			else if(data.state == 'error')
				return Promise.reject(data.info);
		});
}


function defreezeBond(token,code){												//取消冻结某一证券：传入token，股票code，返回true或错误信息
	var FromData = require('form-data');
	var data = new FromData();
	data.append = ('token',token);
	data.append = ('code',code);
	return fetch( HOSTNAME + '/stock/defreeze',{method:'POST',body:data})
		.then((res) => res.json())
		.then((data) => {
			if(data.state == 'ok')
				return Promise.resolve(true);
			else if(data.state == 'error')
				return Promise.reject(data.info);
		});
}

function defreezeMoney(token){														//取消冻结用户资金：传入token，返回true或错误信息
	var FromData = require('form-data');
	var data = new FromData();
	data.append = ('token',token);
	return fetch( HOSTNAME + '/capital/defreeze',{method:'POST',body:data})
		.then((res) => res.json())
		.then((data) => {
			if(data.state == 'ok')
				return Promise.resolve(true);
			else if(data.state == 'error')
				return Promise.reject(data.info);
		});
}


function decreaseMoney(token,amount){														//扣除用户资金：传入token，数量amount，返回true或错误信息
	var FromData = require('form-data');
	var data = new FromData();
	data.append = ('token',token);
	data.append = ('amount',amount);
	return fetch( HOSTNAME + '/capital/decrease',{method:'POST',body:data})
		.then((res) => res.json())
		.then((data) => {
			if(data.state == 'ok')
				return Promise.resolve(true);
			else if(data.state == 'error')
				return Promise.reject(data.info);
		});
}


function decreaseBond(token,code,amount){												//减少某一证券：传入token，股票code，数量amount，返回true或错误信息
	var FromData = require('form-data');
	var data = new FromData();
	data.append = ('token',token);
	data.append = ('code',code);
	data.append = ('amount',amount);
	return fetch( HOSTNAME + '/stock/decrease',{method:'POST',body:data})
		.then((res) => res.json())
		.then((data) => {
			if(data.state == 'ok')
				return Promise.resolve(true);
			else if(data.state == 'error')
				return Promise.reject(data.info);
		});
}



function increaseMoney(token,amount){														//增加用户资金：传入token，数量amount，返回true或错误信息
	var FromData = require('form-data');
	var data = new FromData();
	data.append = ('token',token);
	data.append = ('amount',amount);
	return fetch( HOSTNAME + '/capital/increase',{method:'POST',body:data})
		.then((res) => res.json())
		.then((data) => {
			if(data.state == 'ok')
				return Promise.resolve(true);
			else if(data.state == 'error')
				return Promise.reject(data.info);
		});
}




function increaseBond(token,code,amount){												//增加某一证券：传入token，股票code，数量amount，返回true或错误信息
	var FromData = require('form-data');
	var data = new FromData();
	data.append = ('token',token);
	data.append = ('code',code);
	data.append = ('amount',amount);
	return fetch( HOSTNAME + '/stock/increase',{method:'POST',body:data})
		.then((res) => res.json())
		.then((data) => {
			if(data.state == 'ok')
				return Promise.resolve(true);
			else if(data.state == 'error')
				return Promise.reject(data.info);
		});
}
