'use strict';

let express = require('express');
let bodyParser = require('body-parser');
let moment = require('moment');
let Promise = require('bluebird');

let Database = require('./lib/database.js');
let Trading = require('./lib/trading.js');
let Account = require('./lib/account.js');

let config = require('./config.json');
let db = Database(config.database);
let trading = new Trading(db);
let account = new Account(config.api.account);

let app = express();

trading.addTradingListener((buying_inst, selling_inst, amount, price) => {
    Promise.all([
        account.decreaseCapital(buying_inst.token, amount * price),
        account.increaseCapital(selling_inst.token, amount * price)
    ]).catch((e) => console.error(e));
});

app.use(bodyParser.urlencoded({extended : false}));
app.use(function (req, res, next) {
    console.log(moment().format('YYYY-MM-DD hh:mm:ss'), req.method, req.path);
    return next();
});

app.post('/center/buy', function (req, res) {
    db.commitBuyingInstruction(
        req.body.token,
        req.body.code,
        parseFloat(req.body.price),
        parseFloat(req.body.amount)
    )
        .then((id) => Promise.all([Promise.resolve(id), trading.makeBuying(id)]))
        .then((results) => {
            let [id] = results;
            return res.send({
                state: 'ok',
                id
            });
        })
        .catch((e) => {
            return res.send({
                state: 'error',
                info: e.toString()
            });
        });
});

app.post('/center/sell', function (req, res) {
    db.commitSellingInstruction(
        req.body.token,
        req.body.code,
        parseFloat(req.body.price),
        parseFloat(req.body.amount)
    )
        .then((id) => Promise.all([Promise.resolve(id), trading.makeSelling(id)]))
        .then((results) => {
            let [id] = results;
            return res.send({
                state: 'ok',
                id
            });
        })
        .catch((e) => {
            return res.send({
                state: 'error',
                info: e.toString()
            });
        });
});

app.post('/center/undo/buy', function (req, res) {
    db.cancelInstruction(req.body.id)
        .then(() => {
            return res.send({ state: 'ok' });
        })
        .catch((e) => {
            return res.send({
                state: 'error',
                info: e.toString()
            });
        });
});

app.post('/center/undo/sell', function (req, res) {
    db.cancelInstruction(req.body.id)
        .then(() => {
            return res.send({ state: 'ok' });
        })
        .catch((e) => {
            return res.send({
                state: 'error',
                info: e.toString()
            });
        });
});

app.post('/center/pause', function (req, res) {
    db.pauseStock(req.body.code)
        .then(() => {
            return res.send({ state: 'ok' });
        })
        .catch((e) => {
            return res.send({
                state: 'error',
                info: e.toString()
            });
        });
});

app.post('/center/restart', function (req, res) {
    db.resumeStock(req.body.code)
        .then(() => {
            return res.send({ state: 'ok' });
        })
        .catch((e) => {
            return res.send({
                state: 'error',
                info: e.toString()
            });
        });
});

app.post('/center/limit/surging', function (req, res) {
    db.updateSurgingPrice(req.code, parseFloat(req.limit))
        .then(() => {
            return res.send({ state: 'ok' });
        })
        .catch((e) => {
            return res.send({
                state: 'error',
                info: e.toString()
            });
        });
});

app.post('/center/limit/decline', function (req, res) {
    db.updateDeclingPrice(req.code, parseFloat(req.limit))
        .then(() => {
            return res.send({ state: 'ok' });
        })
        .catch((e) => {
            return res.send({
                state: 'error',
                info: e.toString()
            });
        });
});

app.post('/center/stock/code', function (req, res) {
    Promise.all([
        db.getStockState(req.code),
        db.queryOperationByStock(req.code)
    ])
        .then((results) => {
            let [stock, operations] = results;
            return res.send({
                state: 'ok',
                stock: {
                    code: stock.stock,
                    price: stock.last_price,
                    surging_range: stock.surging_price,
                    decline_range: stock.decline_price,
                    lowest_price: stock.lowest_price,
                    highest_price: stock.highest_price,
                    amount: operations.reduce(((prev, op) => prev + op.amount), 0),
                    last_price: stock.last_price,
                    closing_price: stock.closing_price,
                    opening_price: stock.opening_price,
                    pause: stock.state == 'pause'
                }
            })
        })
        .catch((e) => {
            return res.send({
                state: 'error',
                info: e.toString()
            });
        })
});

app.post('/center/stock/all', function (req, res) {
    db.queryAllOperationStocks()
        .then((stocks) => Promise.map(
            stocks,
            (stock) => {
                return Promise.all([
                    db.getStockState(stock),
                    db.queryOperationByStock(stock)
                ]).then((results) => {
                    let [stock, operations] = results;
                    return Promise.resolve({
                        code: stock.stock,
                        price: stock.last_price,
                        surging_range: stock.surging_price,
                        decline_range: stock.decline_price,
                        lowest_price: stock.lowest_price,
                        highest_price: stock.highest_price,
                        amount: operations.reduce(((prev, op) => prev + op.amount), 0),
                        last_price: stock.last_price,
                        closing_price: stock.closing_price,
                        opening_price: stock.opening_price,
                        pause: stock.state == 'pause'
                    });
                });
            }
        ))
        .then((stocks) => {
            return res.send({
                state: 'ok',
                stocks
            })
        })
        .catch((e) => {
            return res.send({
                state: 'error',
                info: e.toString()
            });
        });
});

app.post('/center/order/id', function (req, res) {
    db.getInstructionById(parseInt(req.body.id, 10))
        .then((inst) => {
            return res.send({
                state: 'ok',
                order: {
                    id: inst.id,
                    code: inst.stock,
                    type: inst.is_buying ? 'buy' : 'sell',
                    amount: inst.original,
                    price: inst.price,
                    timestamp: inst.time.toISOString()
                }
            })
        })
        .catch((e) => {
            return res.send({
                state: 'error',
                info: e.toString()
            });
        });
});

app.post('/center/stock/closed', function (req, res) {
    db.getAllStockState()
        .then((states) => {
            let stocks = states
                .filter((state) => (state.state == 'declined' || state.state == 'surged'))
                .map((state) => { return { stock : state.stock, state : state.state }});
            return res.send({
                state: 'ok',
                stocks
            });
        })
        .catch((e) => {
            return res.send({
                state: 'error',
                info: e.toString()
            });
        });
});

app.listen(config.server.port, function (err) {
    if (err) {
        console.err(err.stack);
        return;
    }
    else {
        console.log(`server listen on ${config.server.port}`);
    }
});
