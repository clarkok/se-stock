'use strict';

let API = require('./api.js');

class Account {
    constructor(api_base) {
        this.api_base = api_base;
    }

    decreaseCapital(token, amount) {
        return API.post(`${this.api_base}/capital/decrease`, {token, amount})
            .then((res) => res.state == "ok" ? Promise.resolve() : Promise.reject(res.info));
    }

    increaseCapital(token, amount) {
        return API.post(`${this.api_base}/capital/increase`, {token, amount})
            .then((res) => res.state == "ok" ? Promise.resolve() : Promise.reject(res.info));
    }
};

module.exports = Account;
