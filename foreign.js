//import module
var restify = require("restify");
var builder = require("botbuilder");
var request = require("request");

//Setup Web Server
var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || "3978", function(){
    console.log('%s listening to %s', server.name, server.url);
});

//create chat connector for communicating with the bot framework service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
});

//Listen for messages from users
server.post('/api/messages', connector.listen());

//create your bot with a function to receive messages from user

var bot = new builder.UniversalBot(connector, function(session){
    var id = session.message.text;
    var options = {
        method:"GET",
        url: "https://www.alphavantage.co/query", 
        //寫在api url ?後面的參數，要放在qs(key)的Json set內
        qs:{
        function:"CURRENCY_EXCHANGE_RATE",
        from_currency:id,
        to_currency:id,
        apikey:"80WQWZNQQ53A0MLK"
        }, 
        //指定json格式的輸出
        json:true
    }
    request(options, function (error, response, body){
        var currency = body;
        var res = JSON.stringify(currency["Realtime Currency Exchange Rate"])
        
        var FromCurrency = currency["Realtime Currency Exchange Rate"][res]["1. From_Currency Code"]
        var ToCurrency = currency["Realtime Currency Exchange Rate"][res]["3. To_Currency Code"]
        var ExchangeRate = currency["Realtime Currency Exchange Rate"][res]["5. Exchange Rate"]
        session.endDialog(`${res} \nopen $${FromCurrency}\nhigh $${ToCurrency}\nlow $${ExchangeRate}`);
    });

}) ;