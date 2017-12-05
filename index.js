'use strict';
const fs = require('fs');
const extend = require('util')._extend;
const translate = require('google-translate-api');
const appRoot = require('app-root-path');
const path = require('path');

var options = {
    minRate: 13
}
const dist = appRoot + '/translated'

if (!fs.existsSync(dist)) {
    fs.mkdirSync(dist);
}

function bookParse(bookSrc, _options, callback) {

    options = extend(options, _options);

    fs.readFile(bookSrc, 'utf8', function(err, data) {

        var bookBody = data
            .match(/<body>[\s\S]+?<\/body>/im)[0];

        var bookDataRate = parseRateWords(bookBody, options);

        fs.writeFile(
            dist + '/rate-filterd.txt',
            bookDataRate.map(e => `${e.original}: ${e.rate}`).join('\n'),
            function() {
            }
        );

        console.log('bookDataRate', bookDataRate.length)

        
        translateBook(bookDataRate)
            .then(function(translations) {

        console.log('translations', translations.length)
                var bookBodyTranslated = fillBookBody(bookBody, translations);
                var newBook = data.replace(/<body>[\s\S]+?<\/body>/im, bookBodyTranslated);
                var filename = path.basename(bookSrc);
                var newBookSrc = dist + '/' + filename.replace(/(.*?)\.(\w+)$/, '$1_EnRu.$2');

                fs.writeFile(newBookSrc, newBook, function() {
                    callback(newBookSrc);
                });
            });
    })
}

function translateBook(bookDataRate, callback) {
    var chunkSize = 100;
    var bookDataRateGroups = bookDataRate
        .map( function(e,i) { 
            return i % chunkSize===0
                ? bookDataRate.slice(i,i+chunkSize)
                : null; 
        })
        .filter(e => !!e );

    return Promise.all(bookDataRateGroups.map(group => {
        let translateData = group
            .map(item => item.original)
            .reduce((out, item) => {
                out += item + "\n";
                return out;
            }, '');
        return translate(translateData, { to: 'ru' })
            .then(response => {
                console.log('Group translation received');
                var result = response.text.split('\n');
                group.forEach((item, i) => {
                    item.translation = result[i]
                });
                return group;
            })
    }))
    .then((result) => {
        return result.reduce((all, group) => all.concat(group), []);
    })
    .catch(err => {
        console.log(err);  
    });
    
}


function parseRateWords(bookData) {
    var bookDataRate = bookData
        .replace(/<\/?[^>]>/g, '')
        .match(/\b[a-z'’\-]+\b/gi)
        .map(e => e.toLowerCase())
        .reduce(function(rate, item) {
            if (!rate[item]) {
                rate[item] = 0;
            }
            rate[item]++;
            return rate;
        }, {});

        fs.writeFile(dist + '/rate.txt', Object.keys(bookDataRate)
        .map(key => `${key}: ${bookDataRate[key]}`).join('\n'), function() {
        });

    return Object.keys(bookDataRate)
        .map(key => {
            return {
                original: key,
                rate: bookDataRate[key]
            }
        })
        .filter(item =>  item.rate <= options.minRate)
        .filter(item => item.original.length > 1)
        .sort((a, b) => b.rate - a.rate);
}

function fillBookBody(bookBody, translations) {
    return translations.reduce(function(bookBody, tr) {

        // TODO Replace only real words!
        var re = new RegExp('([^<]\\b)(' + tr.original + ')(\\b[^>])', 'gi');
        bookBody = bookBody.replace(re, '$1$2 <i>/' + tr.translation + '/</i>$3');
        return bookBody;
    }, bookBody);
}


module.exports = bookParse;