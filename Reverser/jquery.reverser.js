(function($, undefined) {
    
    var _debug = function() {
        console.debug.apply(console, arguments);
    };
    
    var webSockets = (function () { return ('WebSocket' in window); })();
    var defaultOptions = {
        url: null,
        allowWebSocket: true
    };
    var defaultHandlers = {
        $_requestId: function(id) {
            this.data._requestId = id;
        },
        
        $_ping: function() {
            this.send('$_pong');
        }
    };
    var defaultData = {};
    
    var quoteString = function (string) {
        if (string.match(_escapeable)) {
            return '"' + string.replace(_escapeable, function (a) {
                var c = _meta[a];
                if (typeof c === 'string') return c;
                c = a.charCodeAt();
                return '\\u00' + Math.floor(c / 16).toString(16) + (c % 16).toString(16);
            }) + '"';
        }
        return '"' + string + '"';
    };
    
    var _escapeable = /["\\\x00-\x1f\x7f-\x9f]/g;

    var _meta = {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"': '\\"',
        '\\': '\\\\'
    };
    
    var toJSON = function (o) {
        if (typeof (JSON) == 'object' && JSON.stringify)
            return JSON.stringify(o);

        var type = typeof (o);

        if (o === null)
            return "null";

        if (type == "undefined")
            return undefined;

        if (type == "number" || type == "boolean")
            return o + "";

        if (type == "string")
            return quoteString(o);

        if (type == 'object') {
            if (typeof o.toJSON == "function")
                returntoJSON(o.toJSON());

            if (o.constructor === Date) {
                var month = o.getUTCMonth() + 1;
                if (month < 10) month = '0' + month;

                var day = o.getUTCDate();
                if (day < 10) day = '0' + day;

                var year = o.getUTCFullYear();

                var hours = o.getUTCHours();
                if (hours < 10) hours = '0' + hours;

                var minutes = o.getUTCMinutes();
                if (minutes < 10) minutes = '0' + minutes;

                var seconds = o.getUTCSeconds();
                if (seconds < 10) seconds = '0' + seconds;

                var milli = o.getUTCMilliseconds();
                if (milli < 100) milli = '0' + milli;
                if (milli < 10) milli = '0' + milli;

                return '"' + year + '-' + month + '-' + day + 'T' +
                             hours + ':' + minutes + ':' + seconds +
                             '.' + milli + 'Z"';
            }

            if (o.constructor === Array) {
                var ret = [];
                for (var i = 0; i < o.length; i++)
                    ret.push(toJSON(o[i]) || "null");

                return "[" + ret.join(",") + "]";
            }

            var pairs = [];
            for (var k in o) {
                var name;
                var type = typeof k;

                if (type == "number")
                    name = '"' + k + '"';
                else if (type == "string")
                    name = quoteString(k);
                else
                    continue;  //skip non-string or number keys

                if (typeof o[k] == "function")
                    continue;  //skip pairs where the value is a function.

                var val = toJSON(o[k]);

                pairs.push(name + ":" + val);
            }

            return "{" + pairs.join(", ") + "}";
        }
    };
    
    var reverser = function(options, onMessage) {
        var rev = {};
        var settings = $.extend(true, {}, defaultOptions, options);
        var handler, h;
        h = $.extend(true, {}, defaultHandlers, onMessage);
        var d = $.extend(true, {}, defaultData, settings.data);
        if(typeof onMessage == 'function') {
            rev.onmessage = onMessage;
        }
        handler = function(name, parameters) {
            if(rev.onmessage) rev.onmessage(name, parameters);
            if(h[name]) h[name].apply(rev, parameters);
        };
        if(settings.url == null) {
            throw new Error('No url specified.');
        }
        
        var pollSuccess = function(response) {
            try {
                if(response && response.success) {
                    for(var i = 0, l = response.messages.length; i < l; i++) {
                        var message = response.messages[i];
                        rev.handler(message.name, message.parameters);
                    }
                }
            } catch(e) {
                _debug(e);
            }
            rev._pollXhr = null;
            rev._poll();
        };
        
        rev.options = settings;
        rev.handler = handler;
        rev.data = d;
        rev._sendQueue = [];
        rev._poll = function() {
            if(rev._pollXhr) {
                rev._pollXhr.abort();
            }
            rev._pollXhr = $.ajax({
                global: false,
                url: rev.options.url,
                dataType: 'json',
                data: rev.data,
                success: pollSuccess
            });
        };
        rev.send = function(name, parameters) {
            if(!$.isArray(parameters)) {
                parameters = Array.prototype.slice.apply(arguments, [1]);
            }
            if(rev.onsend) rev.onsend(name, parameters);
            
            if(rev._sendXhr) {
               rev._sendQueue.push([name, parameters]);
            } else {
                var data = toJSON({name: name, parameters: parameters});
                rev._sendXhr = $.ajax({
                    global: false,
                    url: rev.options.url + '?' + $.param(rev.data),
                    dataType: 'json',
                    contentType: "application/json; charset=utf-8",
                    data: data,
                    type: 'post',
                    success: function() {
                        if(rev._sendQueue.length > 0) {
                            rev.send.apply(rev, rev._sendQueue.shift());
                        }
                    }
                });
            }
        };
    };
    
})(jQuery);