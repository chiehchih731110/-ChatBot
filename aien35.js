//import module
var restify = require("restify");
var builder = require("botbuilder");
var request = require("request");
var date = require("date");

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
        builder.Prompts.choice(session, "請問要查詢什麼?", ["美股", "匯率", "台股", "港股", "日股", "黃金","歐股"], { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.dialogData.ask = results.response.entity;
        if (session.dialogData.ask == "美股")
            session.replaceDialog('us');
        else if (session.dialogData.ask == "黃金")
            session.replaceDialog('gold');
        else if (session.dialogData.ask == "歐股")
            session.replaceDialog('euro');
        // TODO 加入每個人寫的功能
    }
]).triggerAction({ matches: /^回首頁$/ }); //使用者任何時間打入"回首頁"都可以回到首頁
// #endregion 首頁
// #region 共用的sheetDB function 勿改!!===============
//=========== function 新增Ticker sheetDB =================
function addToeuroSheetDB(euroName, session) {
    console.log("addToeuroSheetDB" + euroName);
    request({
        uri: 'https://sheetdb.io/api/v1/5b3b0ad07e69f',
        json: true,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
            "data": [{
                "euroName": euroName
            }]
        }
    }, function (error, response, body) {
        if (!error && response.statusCode == 201) {
            session.send("儲存成功");
            session.replaceDialog('euro');
        } else {
            console.log(error)
        }
    });
}
//=========== function 刪除Ticker sheetDB =================
function deleteToeuroSheetDB(euroName, session) {
    request({
        // 設定要加入到SheetDB的欄位名(colume), 與儲存內容(ticker)
        uri: 'https://sheetdb.io/api/v1/5b3b0ad07e69f/euroName/'+euroName,
        json: true,
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            session.send("刪除成功");
            session.replaceDialog('euro');
        } else {
            console.log(error)
        }
    });
}



bot.dialog('euro', [
    function (session) {
        builder.Prompts.text(session, "請輸入歐股Ticker:");

        //=======================回首頁按鈕===========================
        var msg = new builder.Message(session);
        msg.suggestedActions(builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "回首頁", "回首頁"),
                builder.CardAction.imBack(session, "我的最愛歐股", "我的最愛歐股"),
                builder.CardAction.imBack(session, "新增最愛歐股", "新增最愛歐股"),
                builder.CardAction.imBack(session, "刪除最愛歐股", "刪除最愛歐股")
            ]
        ));
        session.send(msg);
        // ==========================================================
    },
    function (session, results) {
        var id = results.response;
        var euro = "https://www.quandl.com/api/v3/datasets/EURONEXT/" + id.toUpperCase() + ".json"
        var options = {
            method: "GET",
            url: euro,
            //寫在api url ?後面的參數，要放在qs(key)的Json set內
            qs: {
                 apikey: "Cusz1VPxbAaU8Q72Y2i4"
                 },
            //指定json格式的輸出
            json: true
        }
        request(options, function (error, response, body) {
            var stock = body;
            if(stock["dataset"]){
                //用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
                // var date = JSON.stringify(stock["dataset"]).match(/\d{4}-\d{2}-\d{2}/);
                //parseFloat 將文字改成Float type, toFixed(2)將數字縮到小數點2位數
                var open = parseFloat(stock["dataset"]["data"][0][1]).toFixed(2)
                var high = parseFloat(stock["dataset"]["data"][0][2]).toFixed(2)
                var low = parseFloat(stock["dataset"]["data"][0][3]).toFixed(2)
                var last = parseFloat(stock["dataset"]["data"][0][4]).toFixed(2)
                session.endDialog(`${id.toUpperCase()} : \nopen $${open}\nhigh $${high}\nlow $${low}\nclose $${last}`);
                session.replaceDialog('euro');
            }else {
                session.send(`沒有找到這個股票!`);
                session.replaceDialog('euro');
            }
        });
    }
])

bot.dialog('euro_favorite', [
    function (session) {
        //設定要查詢sheetDB的資料
        var options = {
            method: "GET",
            url: "https://sheetdb.io/api/v1/5b3b0ad07e69f?",
            json: true
        };
        request(options, function (error, response, body) {
            session.dialogData.fav = body;
            session.dialogData.msg = "";
            session.dialogData.count = 0;
            if (!error && response.statusCode == 200) {
                for (var i = 0; i < session.dialogData.fav.length; i++) {
                    showPrice(session.dialogData.fav[i].euroName, session);                    
                }
            }
        });        
    }
]).triggerAction({ matches: /^我的最愛歐股$/ });

//============== 印 出 我 的 最 愛 的 Function ==================
function showPrice(euroName, session) {
    var euro_url = "https://www.quandl.com/api/v3/datasets/EURONEXT/" + euroName + ".json"
    var options = {
        method: "GET",
        url: euro_url,
        qs: {
            apikey: "Cusz1VPxbAaU8Q72Y2i4"
        },
        json: true
    };
    request(options, function (error, response, body) {
        console.log(body);
        console.log("================");
        var stock = body;
            var getDate = stock["dataset"]["data"][0][0];
            var getLast = stock["dataset"]["data"][0][4];
            var msg = euroName + " " + getDate + "Last $" + getLast     
            // 每次request資料近來，就加到變數 session.dialogData.msg
            session.dialogData.msg += msg+"\n";
            // 每次request資料近來，就紀錄(已完成的次數+1)
            session.dialogData.count += 1;  
            // 當(已完成)次數與session.dialogData.fav.length(我的最愛名單的長度)相同，則執行 1列印 2回到美股首頁
            if (session.dialogData.count == session.dialogData.fav.length) 
            {
                session.send(session.dialogData.msg)
                session.replaceDialog('euro');
            }
    });
}
    //============= 新 增 股 票 到 我 的 最 愛 ===============
bot.dialog('addeuro_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要新增的歐股: ");
    },
    function (session, results) {
        session.dialogData.addus = results.response;
        addToeuroSheetDB(session.dialogData.addus, session);

    }
]).triggerAction({ matches: /^新增最愛歐股$/ });

//================ 刪 除 我 的 最 愛 股 票 =================
bot.dialog('deleuro_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要刪除的歐股: ");
    },
    function (session, results) {
        session.dialogData.deleteus = results.response;
        deleteToeuroSheetDB(session.dialogData.deleteus, session);
    }
]).triggerAction({ matches: /^刪除最愛歐股$/ });
// #endregion ======美股結束=============================
