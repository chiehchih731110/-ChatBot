var restify = require('restify');
var builder = require('botbuilder');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || "3978" , function(){
    console.log('%s listening to %s', server.name,server.url);

});

var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword:process.env.MicrosoftAppPassword,

});

//Listen for messages from users

server.post('/api/messages',connector.listen());

// Create your bot with a function to receive messages from the user

var bot = new builder.UniversalBot(connector,function(session){
    var id = session.message.text;
    var options={
        method:"GET",
        url:"https://www.alphavantage.co/query",
        qs:{
        from_currency:"USD",
        to_currency:"JSP",
        apikey:"80WQWZNQQ53A0MLK"
        }
    }
    request(options, function(error,response,body){
        var stock = JSON.parse(body);
        if (stock.result)
        session.endDialog('將貨幣${stock.from_currency} 轉換成${Exchange Rate} ${stock.to_Currency}元 ');
        else
        session.endDialog(stock.errMsg);
    });
})