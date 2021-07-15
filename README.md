## Help to read English text
This will help you read books in English more easily.
The algorithm parses the book, finds rare words and adds a Russian translation next to them.

# Install
`npm install translate-book`

## How to use

```javascript
const bookUrl = './books/Kerroll_Alice-s-Adventures-in-Wonderland-illustrated.93955.fb2';
// Supports only fb2 books.

const params = {
    maxRate: 10
}

translateBook.translateBookFile(bookUrl, params)
    .then(path => {
        // path to translated book
    })
```

## Available params
- maxRate - number
- debug - boolean
- dist - string

Live demo: [translate-book.herokuapp.com](https://translate-book.herokuapp.com/)