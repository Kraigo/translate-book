var express = require('express');
var router = express.Router();
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var fs = require('fs.extra');
var uploadDir = './upload/';

router.post('/', multipartMiddleware, function(req, res, next) {

    var file = req.files.file;

    if (file && file.type) {

        fs.move(file.path, uploadDir + file.name, function(fileData) {
            res.redirect('/')
        })

    }


});

module.exports = router;