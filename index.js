'use strict';
const fs = require('fs');
const extend = require('util')._extend;
const yandex = require('yandex-translate')(process.env.YANDEX_KEY);

var options = {
    minRate: 10,
    level: 0.1,
    dist: __dirname + '/translated'
}

if (!fs.existsSync(options.dist)) {
    fs.mkdirSync(options.dist);
}
if (!fs.existsSync(options.dist + '/debug')) {
    fs.mkdirSync(options.dist + '/debug');
}

function bookParse(bookSrc, _options, callback) {

    options = extend(options, _options);

    fs.readFile(bookSrc, 'utf8', function(err, data) {

        var bookBody = data.match(/<body>([\s\S]*?)<\/body>/im)[1];
        var bookData = cleanTags(bookBody);

        var bookDataRate = parseRateWords(bookData, options);

        writeToFile(bookDataRate, bookSrc);

        translateBook(bookDataRate, function(translations) {

            var bookBodyTranslated = fillBookBody(bookBody, translations);
            var newBook = data.replace(/<body>([\s\S]*?)<\/body>/im, '<body>' + bookBodyTranslated + '<\/body>');
            var newBookSrc = options.dist + '/' + bookSrc.replace(/(.*?)\.(\w+)$/, '$1_EnRu.$2');

            fs.writeFile(newBookSrc, newBook, function() {
                callback(newBookSrc);
            });
        });
    })
}

function translateBook(bookDataRate, callback) {

    callback([{ original: 'below', translation: 'ниже', rate: 1 },
        { original: 'chapter', translation: 'глава', rate: 1 },
        { original: 'trying', translation: 'пишет', rate: 1 },
        { original: 'sometimes', translation: 'кое-что', rate: 1 },
        { original: 'on', translation: 'тест', rate: 1 }
    ])
    return;

    var translateSource = bookDataRate
        .map(item => item.original)
        .reduce((out, item) => {
            out += item + "\n";
            return out;
        }, '');

    console.log("Translate %s words", bookDataRate.length)

    yandex.translate(translateSource, { to: 'ru' }, function(err, translations) {
        if (err) throw err;
        var result = translations.text[0].split('\n');
        bookDataRate.forEach(function(item, i) {
            item.translation = result[i];
        })
        callback(bookDataRate);
    });
}

function cleanTags(bookBody) {
    return bookBody
        .toLowerCase()

    .replace(/<\/?(.*?)>/g, '') // remove all <*>

    .replace(/\s{2,}/g, ' ') // remove double space

    .replace(/[^\s\w'’]/g, '') // remove symbols non-word

    .replace(/\d/g, '') // remove numbers

    .split(' ')

    .map((word) => { // remove 'quotes' for each word
        word = word.replace(/^[^\w]+/, '');
        word = word.replace(/[^\w]{1,}\w*$/, '');
        return word;
    })

    .filter(item => item && item.length > 2) // remove nulls and < 3 chars

    .join(' ');
}

function parseRateWords(bookData) {
    var bookDataRate;

    bookDataRate = bookData.split(' ')
        .reduce(function(rate, item) {
            if (!rate[item]) {
                rate[item] = 0;
            }
            rate[item]++;
            return rate;
        }, {});

    bookDataRate = Object.keys(bookDataRate)
        .map(key => {
            return {
                original: key,
                rate: bookDataRate[key]
            }
        })
        .sort((a, b) => b.rate - a.rate);

    bookDataRate = bookDataRate
        .filter(item => item.rate <= options.minRate || item.rate / bookDataRate.length * 100 < options.level);

    return bookDataRate;
}

function uniqueWords(bookBody) {
    return bookBody
        .split(' ')
        .reduce(function(accum, current) {
            if (accum.indexOf(current) < 0) {
                accum.push(current);
            }
            return accum;
        }, [])
        .join(' ');
}

function writeToFile(bookDataRate, bookSrc) {
    var rateStr = bookDataRate.reduce((output, item) => {
        var pe = item.rate / bookDataRate.length * 100;
        return output += '[' + pe.toFixed(5) + '%] ' + item.rate + ': ' + item.original + '\n';
    }, '');
    var debugSrc = options.dist + '/debug/' + bookSrc.replace(/(.*?)\.(\w+)$/, '$1_RATE.txt');
    fs.writeFile(debugSrc, rateStr);
}

function fillBookBody(bookBody, translations) {
    return translations.reduce(function(bookBody, tr) {
        var re = new RegExp('(\\b' + tr.original + '\\b)(?![^<]*>)', "gim");
        bookBody = bookBody.replace(re, tr.original + ' <i>/' + tr.translation + '/</i> ');
        return bookBody;
    }, bookBody);
}


module.exports = bookParse;