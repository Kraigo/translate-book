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

        var bookBody = data.match(/<body>[\s\S]+?<\/body>/im)[0];

        var bookDataRate = parseRateWords(bookBody, options);

        translateBook(bookDataRate)
            .then(function(translations) {

                var bookBodyTranslated = fillBookBody(bookBody, translations);
                var newBook = data.replace(/<body>[\s\S]+?<\/body>/im, '<body>' + bookBodyTranslated + '<\/body>');
                var filename = path.basename(bookSrc);
                var newBookSrc = dist + '/' + filename.replace(/(.*?)\.(\w+)$/, '$1_EnRu.$2');

                fs.writeFile(newBookSrc, newBook, function() {
                    callback(newBookSrc);
                });
            });
    })
}

function translateBook(bookDataRate, callback) {
    var chunkSize = 10;
    var bookDataRateGroups = bookDataRate        
        .slice(0, 100)
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
        .sort((a, b) => b.rate - a.rate);
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

function fillBookBody(bookBody, translations) {
    return translations.reduce(function(bookBody, tr) {
        var re = new RegExp('(\\b' + tr.original + '\\b)(?![^<]*>)', "gim");
        bookBody = bookBody.replace(re, '$1 <i>/' + tr.translation + '/</i> ');
        return bookBody;
    }, bookBody);
}


module.exports = bookParse;