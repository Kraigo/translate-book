const translateBook = require('./index'); //require('translate-book'); 

const bookUrl = './books/1 - Harry Potter and the Philos - J.K. Rowling.fb2';

translateBook.translateBookFile(bookUrl, {})
    .then(function(path) {
        console.log(path)
    });