var restify = require('restify');
var builder = require('botbuilder');
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || "3978", function () {
    console.log('%s listeniing to %s', server.name, server.url);
});

var connector = new builder.ChatConnector({
    appld: process.env.MircosoftAppld,
    appPassword: process.env.MicrosoftAppPassword,
});

server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector,
    function (session) {
        var id = session.message.text;
        var options = {
            method: "GET",
            url: "https://www.alphavantage.co/query",
            qs: { function: "TIME_SERIES_DAILY", symbol: id, apikey: "BSVAQV1T4LLSEVKZ" 
        },
            json:ture
        }
            request(options, function (error, response, body) {
                var stock = body;
                    session.endDialog(`${stock["Time Series (Daily)"]
                ["2018-06-22"]["4. close"]}`);
         
    });
    });