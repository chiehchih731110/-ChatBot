//import module
var restify = require("restify");
var builder = require("botbuilder");
var request = require("request");
// var toFixed = require('tofixed');

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

var bot = new builder.UniversalBot(connector, [
    function(session){
        builder.Prompts.choice(session, "請問要您要怎麼查詢加密貨幣?", ["BTC", "ETH", "XRP","XMR","DOGE"], { listStyle: builder.ListStyle.button });
    },
    function (session, results){
    var id = results.response.entity;
    var options = {
        method:"GET",
        url: "https://min-api.cryptocompare.com/data/price", 
        //寫在api url ?後面的參數，要放在qs(key)的Json set內
        qs:{
        fsym: id,
        // symbol: id,
        tsyms:"USD,TWD",
        // apikey:"2C8MUXABNVMED4DS"
        }, 
        //指定json格式的輸出
        json:true
    }
    request(options, function (error, response, body){
        var coin = body;
        if(coin){                 
            session.endDialog(`${id}今日價格如下:<br>USD： ${coin.USD}<br>新台幣：${coin.TWD}`);
        }else{
            session.endDialog(`沒有找到這個加密貨幣!`);
        }
    });
}]);