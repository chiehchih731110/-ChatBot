var restify = require('restify');
var builder = require('botbuilder');
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || "3978",function(){
      console.log('%s listening to %s', server.name,server.url);
});
var connector = new builder.ChatConnector({
      appId:process.env.MicrosoftAppId,
      appPassword:process.env.MicrosoftAppPassword,
});

server.post('/api/messages',connector.listen());
var bot = new builder.UniversalBot(connector,
function(session){
      var id = session.message.text;
      var options ={
            method: "GET",
            url:"http://chartapi.finance.yahoo.com/instrument/1.0/GOOG/chartdata;type=quote;range=1d/json",
            formData:{id:id}
      }
      request(options, function (error, response, body){
         var stock = JSON.parse(body);
         if (stock.result)
             session.endDialog(`${stock.n}(${stock.id}\n\n當盤成交價 : $${stock.z}
                  \n\n當盤成交量:${stock.tv}\n\n累積成交量:${stock.v}`);   
      else 
            session.endDialog(stock.errMsg);
      });
});