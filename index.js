'use strict';
const fs = require('fs');
const translate = require('google-translate-api');
const appRoot = require('app-root-path');
const path = require('path');
const WordPOS = require('wordpos');
const wordpos = new WordPOS({stopwords: true});

const _options = {
    maxRate: 10,
    debug: false,
    dist: appRoot + '/translated'
}

function translateBookFile(bookSrc, options) {
    options = Object.assign({}, options, _options);

    if (!fs.existsSync(options.dist)) {
        fs.mkdirSync(options.dist);
    }

    return new Promise((resolve, reject) => {

        fs.readFile(bookSrc, 'utf8', function(err, data) {
            
            translateBook(data)
                // .then(function(newBook) {
                //     var filename = path.basename(bookSrc);
                //     var newBookSrc = options.dist + '/' + filename.replace(/(.*?)\.(\w+)$/, '$1_EnRu.$2');
                //     fs.writeFile(newBookSrc, newBook, function() {
                //         resolve(newBookSrc);
                //     });
                // })            
        })
    })
}

function translateBook2(data, options) {

    options = Object.assign({}, options, _options);

    var bookBody = data.match(/<body>[\s\S]+?<\/body>/im)[0];
    var bookDataRate = parseRateWords(bookBody, options);

    if (options.debug) {
        fs.writeFile(
            options.dist + '/rate-filtered.txt',
            bookDataRate.map(e => `${e.original}: ${e.rate}`).join('\n'),
            function() {}
        );
    }

    return translateRates(bookDataRate)
            .then(function(translations) {
                var bookBodyTranslated = translateBody(bookBody, translations);
                return data.replace(/<body>[\s\S]+?<\/body>/im, bookBodyTranslated);
            });
}

function translateBook(data, options) {
    options = Object.assign({}, options, _options);

    let bookBody = getBodyText(data);
    let rates = {}
    bookBody.reduce((promise, p) => {

        return promise.then(() => {
            return wordpos.getPOS(p)
                .then((stats) => {

                })
        });

    }, Promise.resolve())

    // return Promise.reject();
}

function translateRates(bookDataRate) {
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


function parseRateWords(bookData, options) {
    var bookDataRate = bookData
        .replace(/<\/?[^>]\/?>/g, '')
        .match(/\b[a-z'’\-]+\b/gi)
        .map(e => e.toLowerCase())
        .reduce(function(rate, item) {
            if (!rate[item]) {
                rate[item] = 0;
            }
            rate[item]++;
            return rate;
        }, {});

        if (options.debug) {
            fs.writeFile(
                dist + '/rate.txt',
                Object.keys(bookDataRate).map(key => `${key}: ${bookDataRate[key]}`).join('\n'),
                function() {}
            );
        }

    return Object.keys(bookDataRate)
        .map(key => {
            return {
                original: key,
                rate: bookDataRate[key]
            }
        })
        .filter(item =>  item.rate <= options.maxRate)
        .filter(item => item.original.length > 1)
        .sort((a, b) => b.rate - a.rate);
}

function translateBody(bookBody, translations) {
    return translations.reduce(function(bookBody, tr) {
        var re = new RegExp('\\b(' + tr.original + ')\\b(?!\\s?\/?>)', 'gi');
        bookBody = bookBody.replace(re, '$1 <i>/' + tr.translation + '/</i>');
        return bookBody;
    }, bookBody);
}

function getBodyText(data) {
    let matchBody = data.match(/<body>[\s\S]+?<\/body>/im);

    if (!matchBody)
        throw new Error("File incorrect. <body> missed");
    
    return matchBody[0]
        .match(/<p>.+<\/p>/g)
        .map(p => p.replace(/<\/?[^>]+\/?>/g, ''))
        .filter(p => p);
}


module.exports = {
    translateBookFile,
    translateBook
}