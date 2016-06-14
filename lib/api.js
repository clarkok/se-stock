'use strict';

let Promise = require('bluebird');
let fetch = require('node-fetch');
let FormData = require('form-data');

function obj2form(obj) {
    return Object.getOwnPropertyNames(obj)
        .reduce(
            (prev, current) => {
                prev.append(current, obj[current]);
                return prev;
            },
            new FormData()
        );
}

function obj2query(obj) {
    return Object.getOwnPropertyNames(obj).map((key) => `key=${encodeURIComponent(obj[key])}`).join('&');
}

exports.post = function (url, body) {
    return fetch(url, { method: 'POST', body: obj2form(body) })
        .then((res) => res.json());
};

exports.get = function (url, body) {
    return fetch(`${url}?${obj2query(body)}`)
        .then((res) => res.json());
};
