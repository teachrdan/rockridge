'use strict';

var Nexmo = require('./nexmo.model');

exports.sendText = function(req, res, next) {
  var nexmo = new Nexmo();
  nexmo.sendText(req.body.to, req.body.message, function(response) {
    res.send(response);
  });
};
