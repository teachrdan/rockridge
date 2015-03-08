'use strict';

angular.module('rockridge')
.factory('Nexmo', function($resource) {
  return $resource('api/nexmo/:id/:controller',
  {id: '@rid'},
  {
    text: {
      method: 'POST',
      params: {
        id: 'me',
        controller: 'text'
      }
    }
  });
});
