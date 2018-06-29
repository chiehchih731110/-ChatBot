var restify = require('restify');
var builder = require('botbuilder');
var request =require("request")
var Date = require("date")
var server = restify.createServer();
 
server.listen(process.env.port || process.env.PORT || "3978",function(){
      console.log('%s listening to %s', server.name,server.url);
});
var connector = new builder.ChatConnector({
      appId:process.env.MicrosoftAppId,
      appPassword:process.env.MicrosoftAppPassword,
});

server.post('/api/messages',connector.listen());
var bot = new builder.UniversalBot(connector,[
      function(session){
      session.send("歡迎查詢港股")
      builder.Prompts.text(session,"請輸入港股代號")      
      },
      function(session, results){ 
            session.dialogData.num=results.response;
            var id2 = session.dialogData.num;
            var str1 = "https://www.quandl.com/api/v3/datasets/HKEX/"+id2+".json"
            var options ={
                  method: "GET",
                  url:str1,
                  qs:{                        
                        api_key:"FGaaWn-aS7oW9ZRYxrZj"
                  },
                  json:true
            }
      request(options, function (error, response, body){  
            var stock = body; 
            if(stock["dataset"]["data"][0][0]){
                  //用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
                  var date = JSON.stringify(stock["dataset"]["data"][0][0]).match(/\d{4}-\d{2}-\d{2}/);        
            //TODO: 更好的方式是用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
            var close = stock["dataset"]["data"][0][9]
            session.send("請等一下")
            session.endDialog(`您查詢的結果為${date} 收盤價 at : $${close}`);
      }else{
            session.endDialog(`沒有找到這個股票!`);
        }
      });
}]);