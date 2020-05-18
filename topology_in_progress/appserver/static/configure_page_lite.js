/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["awsJsonp"];
/******/ 	window["awsJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, callbacks = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, __webpack_require__);

/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		0:0
/******/ 	};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}

/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, __webpack_require__);

/******/ 		// an array means "currently loading".
/******/ 		if(installedChunks[chunkId] !== undefined) {
/******/ 			installedChunks[chunkId].push(callback);
/******/ 		} else {
/******/ 			// start chunk loading
/******/ 			installedChunks[chunkId] = [callback];
/******/ 			var head = document.getElementsByTagName('head')[0];
/******/ 			var script = document.createElement('script');
/******/ 			script.type = 'text/javascript';
/******/ 			script.charset = 'utf-8';
/******/ 			script.async = true;

/******/ 			script.src = __webpack_require__.p + "bundles/" + chunkId + "." + {"1":"6d999aedd6b529ff7166","2":"d4488c3e5d5c866fa606","3":"af3caa477f966f5d6470","4":"dc3ce15576d61299a9f7","5":"01f805c1db5cb2e46c27","6":"eafda0234cfd45c3c3d8"}[chunkId] + ".js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	
	__webpack_require__.p = (function getPath() {

	    /**
	     * This is a port of make_url from js/util.js
	     */
	    function make_url() {
	        var output = '', seg, len;
	        for (var i=0,l=arguments.length; i<l; i++) {
	            seg = arguments[i].toString();
	            len = seg.length;
	            if (len > 1 && seg.charAt(len-1) == '/') {
	                seg = seg.substring(0, len-1);
	            }
	            if (seg.charAt(0) != '/') {
	                output += '/' + seg;
	            } else {
	                output += seg;
	            }
	        }

	        // augment static dirs with build number
	        if (output!='/') {
	            var segments = output.split('/');
	            var firstseg = segments[1];
	            if (firstseg=='static' || firstseg=='modules') {
	                var postfix = output.substring(firstseg.length+2, output.length);
	                output = '/' + firstseg;
	                if (window.$C['BUILD_NUMBER']) output += '/@' + window.$C['BUILD_NUMBER'];
	                if (window.$C['BUILD_PUSH_NUMBER']) output += '.' + window.$C['BUILD_PUSH_NUMBER'];
	                if (segments[2] == 'app')
	                    output += ':'+ getConfigValue('APP_BUILD', 0);
	                output += '/' + postfix;
	            }
	        }

	        var root = getConfigValue('MRSPARKLE_ROOT_PATH', '/');
	        var djangoRoot = getConfigValue('DJANGO_ROOT_PATH', '');
	        var locale = getConfigValue('LOCALE', 'en-US');

	        var combinedPath = "";
	        if (djangoRoot && output.substring(0, djangoRoot.length) === djangoRoot) {
	            combinedPath = output.replace(djangoRoot, djangoRoot + "/" + locale.toLowerCase());
	        } else {
	            combinedPath = "/" + locale + output;
	        }

	        if (root == '' || root == '/') {
	            return combinedPath;
	        } else {
	            return root + combinedPath;
	        }
	    }

	    function getConfigValue(key, defaultValue) {
	        if (window.$C && window.$C.hasOwnProperty(key)) {
	            return window.$C[key];
	        } else {
	            if (defaultValue !== undefined) {
	                return defaultValue;
	            }

	            throw new Error('getConfigValue - ' + key + ' not set, no default provided');
	        }
	    }

	    return make_url('/static/app/splunk_app_aws') + '/';
	})();
	'use strict';

	__webpack_require__.e/* require */(1, function(__webpack_require__) { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(1), __webpack_require__("util/router_utils"), __webpack_require__(206), __webpack_require__(211)]; (function (Router, Router_utils, Config) {
	    // load config context data
	    Config.loadContext().done(function () {
	        new Router();
	        Router_utils.start_backbone_history();
	    });
	}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));});

/***/ })
/******/ ]);