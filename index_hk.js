//import module
var restify = require("restify");
var builder = require("botbuilder");
var request = require("request");

//Setup Web Server
var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || "3978", function () {
    console.log('%s listening to %s', server.name, server.url);
});

//create chat connector for communicating with the bot framework service

var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
});

//Listen for messages from users
server.post('/api/messages', connector.listen());

// create your bot with a function to receive messages from user
// 歡迎訊息頁
var bot = new builder.UniversalBot(connector,
    function (session) {
        session.send('歡迎來到FinTastic');
        session.replaceDialog('mainMenu')
    });

bot.dialog('mainMenu', [
    function (session) {
        builder.Prompts.choice(session, "請問要查詢什麼?", ["美股", "匯率", "台股", "港股", "日股", "黃金"], { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.dialogData.ask = results.response.entity;
        if (session.dialogData.ask == "美股")
            session.replaceDialog('us');
        else if (session.dialogData.ask == "黃金")
            session.replaceDialog('gold');
        else if (session.dialogData.ask == "港股")
            session.replaceDialog('hkstock');
        // TODO 加入每個人寫的功能
    }
]).triggerAction({ matches: /^回首頁$/ }); //使用者任何時間打入"回首頁"都可以回到首頁
// #region 共用的sheetDB function 勿改!!===============
//=========== function 新增Ticker sheetDB =================
function addToSheetDB(ticker, column, sheet, returnDialog, session) {
    // 設定要加入到SheetDB的欄位名(colume), 與儲存內容(ticker)
    var body_data = `[{"${column}" : "${ticker}"}]`;
    request({
        uri: 'https://sheetdb.io/api/v1/5b3b454109706?sheet='+sheet,
        json: true,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {"data": body_data}
    }, function (error, response, body) {
        if (!error && response.statusCode == 201) {
            session.send(ticker+"儲存成功");
            session.replaceDialog(returnDialog);
        } else {
            console.log(error+"新增sheetDB失敗")
        }
    });
}

//=========== function 刪除Ticker sheetDB =================
function deleteToSheetDB(ticker, column, sheet, returnDialog, session) {
    request({
        // 設定要加入到SheetDB的欄位名(colume), 與儲存內容(ticker)
        uri: 'https://sheetdb.io/api/v1/5b3b454109706'+column +'/'+ ticker +'?sheet='+ sheet,
        json: true,
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            session.send(ticker+"刪除成功");
            session.replaceDialog(returnDialog);
        } else {
            console.log(error+"刪除sheetDB失敗")
        }
    });
}
// #endregion =====sheetDB====================================================
bot.dialog('hkstock', [
    function (session) {
        builder.Prompts.text(session, "請輸入港股Ticker:");

        //=======================推 薦 按 鈕===========================
        var msg = new builder.Message(session);
        msg.suggestedActions(builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "首頁", "🏠首頁"),
                builder.CardAction.imBack(session, "我的最愛", "💖我的最愛港股"),
                builder.CardAction.imBack(session, "新增最愛", "📁新增最愛港股"),
                builder.CardAction.imBack(session, "刪除最愛", "🗑️刪除最愛港股")
            ]
        ));
        session.send(msg);
        // ==========================================================
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
        session.replaceDialog('hkstock');
  }else{
        session.endDialog(`沒有找到這個股票!`);
        session.replaceDialog('hkstock');
    }
  });
    }
]);
//===================(us) 列 印 我 的 最 愛 ===================
bot.dialog('hk_favorite', [
    function (session) {
        session.send(`![search](http://lincoln.edu.my/design_css/images/ProgressImage.gif)`)
        //設定要查詢sheetDB的資料
        var options = {
            method: "GET",
            url: "https://sheetdb.io/api/v1/5b3b454109706?sheet=hkstock",
            json: true
        };
        request(options, function (error, response, body) {
            session.dialogData.fav = body;
            session.dialogData.msg = "";
            session.dialogData.count = 0;
            if (!error && response.statusCode == 200) {
                for (var i = 0; i < session.dialogData.fav.length; i++) {
                    showPrice(session.dialogData.fav[i].hkticker, session);                    
                }
            }
        });        
    }
]).triggerAction({ matches: /^我的最愛港股$/ });


//============== 印 出 我 的 最 愛 的 Function ==================
function showPrice(hkticker, session) {
    session.dialogData.num=results.response;
        var id2 = session.dialogData.num;
        var str1 = "https://www.quandl.com/api/v3/datasets/HKEX/"+id2+".json"
    var options = {
        method: "GET",
        url: str1,
        qs: {
            api_key:"FGaaWn-aS7oW9ZRYxrZj"
        },
        json: true
    };
    request(options, function (error, response, body) {
        var stock = body;
        if (stock["dataset"]["data"][0][0]) {
            var date = JSON.stringify(stock["dataset"]["data"][0][0]).match(/\d{4}-\d{2}-\d{2}/);
            
            var close = stock["dataset"]["data"][0][9]  
            // 每次request資料近來，就加到變數 session.dialogData.msg
            session.dialogData.msg += date+close+"\n";
            // 每次request資料近來，就紀錄(已完成的次數+1)
            session.dialogData.count += 1;  
            // 當(已完成)次數與session.dialogData.fav.length(我的最愛名單的長度)相同，則執行 1列印 2回到美股首頁
            if (session.dialogData.count == session.dialogData.fav.length) {
                session.send(session.dialogData.msg)
                session.replaceDialog('hkstock');
            }
        } else {
            session.send(`沒有找到${hkticker}`);
        }
    });
}


//============= 新 增 股 票 到 我 的 最 愛 ===============
bot.dialog('add_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要新增的港股:");
    },
    function (session, results) {
        session.dialogData.addTicker = results.response;
        //呼叫addToSheetDB function, 將收到的Ticker存入sheetDB, 
        //column = google試算表的欄位名稱; sheet = googe試算表的工作表名稱; returnDialog = 完成後回到哪個dialog
        addToSheetDB(session.dialogData.addTicker.toUpperCase(), column="hkticker", sheet="hkstock", returnDialog="hkstock", session);
    }
]).triggerAction({ matches: /^新增最愛$/ });


//================ 刪 除 我 的 最 愛 股 票 =================
bot.dialog('del_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要刪除的港股:");
    },
    function (session, results) {
        session.dialogData.delTicker = results.response;
        //先查詢Ticker是否存在sheetDB
        var options = {
            method: "GET",
            //設定API ID= 5b35ec114e823 ; sheet= googe試算表的工作表名稱
            url: "https://sheetdb.io/api/v1/5b3b454109706?sheet=hkstock",
            json: true
        };
        request(options, function(error, response, body) {
            session.dialogData.myFav = body;
            session.dialogData.isinside = false;
            // 檢查要刪除的Ticker 是否在sheetDB內(我的最愛), 如果有就刪除Ticker, 沒有就回錯誤訊息
            for (var i =0; i<session.dialogData.myFav.length; i++){
                if (session.dialogData.myFav[i].hkticker == session.dialogData.delTicker.toUpperCase()){
                    //呼叫deleteToSheetDB function, 將收到的Ticker從sheetDB刪除
                    //column = google試算表的欄位名稱; sheet = googe試算表的工作表名稱; returnDialog = 完成後回到哪個dialog 
                    session.dialogData.isinside = true;
                    deleteToSheetDB(session.dialogData.delTicker.toUpperCase(), column="hkticker", sheet="hkstock", returnDialog="hkstock", session);
                    break; 
                }
            };
            if (session.dialogData.isinside==false){
                session.send(session.dialogData.delTicker+"不在最愛名單👺");
                session.replaceDialog('hkstock');
            }
        });        
    }
]).triggerAction({ matches: /^刪除最愛港股$/ });
// #endregion ======港股結束=============================

