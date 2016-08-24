var booktranslateBookparse = require('translate-book');

// const book = 'Evan_Hanter__Three_Blind_Mice.fb2';
const book = 'Jungle_Book-Rudyard_Kipling.fb2';
translateBook(book, { level: 1 }, function(path) {
    console.log(path)
});