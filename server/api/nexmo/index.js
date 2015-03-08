'use strict';

var express = require('express');
var controller = require('./nexmo.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.post('/me/text', auth.isAuthenticated(), controller.sendText);

module.exports = router;
