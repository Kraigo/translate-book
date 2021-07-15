const translateBook = require('./index'); //require('translate-book'); 
const path = require('path');

const bookUrl = path.join(__dirname, './books/Kerroll_Alice-s-Adventures-in-Wonderland-illustrated.93955.fb2');

translateBook.translateBookFile(bookUrl, {})
    .then(function(path) {
        console.log(path)
    });