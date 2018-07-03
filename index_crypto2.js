// #region ChatBot基本設定 勿改!!
var restify = require("restify");
var builder = require("botbuilder");
var request = require("request");

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
// 歡迎訊息頁
var bot = new builder.UniversalBot(connector,
    function (session) {
        session.send('![FinTasticLogo](https://gudywedding.com.tw/wp-content/uploads/2018/07/fintastic_logo300x61.jpg)');
        session.send(' ====== **歡 迎 來 到 F i n T a s t i c** ======');

        session.replaceDialog('mainMenu')
    });
// #endregion
// #region 首頁 - 需要修改
bot.dialog('mainMenu', [
    function (session) {
        builder.Prompts.choice(session, "請問要查詢什麼?", ["美股", "匯率", "台股", "港股", "日股", "黃金","加密貨幣"], { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.dialogData.ask = results.response.entity;
        if (session.dialogData.ask == "美股")
            session.replaceDialog('us');
        else if (session.dialogData.ask == "黃金")
            session.replaceDialog('gold');
        else if (session.dialogData.ask == "加密貨幣")
            session.replaceDialog('crypto1');
        // TODO 加入每個人寫的功能
    }
]).triggerAction({ matches: /^首頁$/ }); //任何時間打入"回首頁"都可以回到此Dialog
// #endregion 首頁
// #region 共用的sheetDB function 勿改!!===============
//=========== function 新增Ticker sheetDB =================
function addToSheetDB(ticker, column, sheet, returnDialog, session) {
    // 設定要加入到SheetDB的欄位名(colume), 與儲存內容(ticker)
    var body_data = `[{"${column}" : "${ticker}"}]`;
    request({
        uri: 'https://sheetdb.io/api/v1/5b3a27beea7a1?sheet='+sheet,
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
        uri: 'https://sheetdb.io/api/v1/5b3a27beea7a1/'+column +'/'+ ticker +'?sheet='+ sheet,
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
// #region ===================== (us) 美 股 首 頁 ==============================
bot.dialog('us', [
    function (session) {
        builder.Prompts.text(session, "請輸入美股Ticker:");
        //=======================推 薦 按 鈕===========================
        var msg = new builder.Message(session);
        msg.suggestedActions(builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "首頁", "🏠首頁"),
                builder.CardAction.imBack(session, "我的最愛", "💖我的最愛"),
                builder.CardAction.imBack(session, "新增最愛", "📁新增最愛"),
                builder.CardAction.imBack(session, "刪除最愛", "🗑️刪除最愛")
            ]
        ));
        session.send(msg);
        // ==========================================================
    },
    function (session, results) {
        var id = results.response;
        var options = {
            method: "GET",
            url: "https://www.alphavantage.co/query",
            //寫在api url ?後面的參數，要放在qs(key)的Json set內
            qs: {
                function: "TIME_SERIES_DAILY",
                symbol: id,
                apikey: "2C8MUXABNVMED4DS"
            },
            //指定json格式的輸出
            json: true
        };
        request(options, function (error, response, body) {
            var stock = body;
            if (stock["Time Series (Daily)"]) {
                //用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
                // var date = JSON.stringify(stock["Time Series (Daily)"]).match(/\d{4}-\d{2}-\d{2}/);
                var date = JSON.stringify(stock["Time Series (Daily)"]).match(/\d{4}-\d{2}-\d{2}/g);
                //parseFloat 將文字改成Float type, toFixed(2)將數字縮到小數點2位數
                var open = parseFloat(stock["Time Series (Daily)"][date[0]]["1. open"]).toFixed(2)
                var high = parseFloat(stock["Time Series (Daily)"][date[0]]["2. high"]).toFixed(2)
                var low = parseFloat(stock["Time Series (Daily)"][date[0]]["3. low"]).toFixed(2)
                var close = parseFloat(stock["Time Series (Daily)"][date[0]]["4. close"]).toFixed(2)
                var change = parseFloat(stock["Time Series (Daily)"][date[0]]["4. close"]-stock["Time Series (Daily)"][date[1]]["4. close"]).toFixed(2)
                var changePercent = parseFloat((stock["Time Series (Daily)"][date[0]]["4. close"]-stock["Time Series (Daily)"][date[1]]["4. close"])/stock["Time Series (Daily)"][date[1]]["4. close"]*100).toFixed(2)
                session.send(`${id.toUpperCase()} : ${date[0]} \nopen $${open}\nhigh $${high}\nlow $${low}\nclose $${close}\nchange $${change}\npercent ${changePercent}%`);
                session.replaceDialog('us');
            } else {
                session.send(`沒有找到這個股票!`);
                session.replaceDialog('us');
            }
        });
    }
])

//以下為crypto ======================================

bot.dialog('crypto0', [
    
    function (session, results) {
        session.dialogData = results.response
         
            if(true){
                var options = {
                    method:"GET",
                    url: "https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,XRP,XMR,DOGE&tsyms=USD,TWD",           
                    json:true
                }
                

                request(options, function (error, response, body){
                    var coin = body;
                    if(coin){
                        session.endDialog(
                            `今日熱門貨幣價格如下:<br>比特幣\n:\nUSD:\n${coin.BTC.USD}\n,\nNTD:\n${coin.BTC.TWD}<br>以太幣\n:\nUSD:\n${coin.ETH.USD}\n,\nNTD:\n${coin.ETH.TWD}<br>瑞波幣\n:\nUSD:\n${coin.XRP.USD}\n,\nNTD:\n${coin.XRP.TWD}<br>門羅幣\n:\nUSD:\n${coin.XMR.USD}\n,\nNTD:\n${coin.XMR.TWD}<br>🐕狗幣:\nUSD:\n${coin.DOGE.USD}\n,\nNTD:\n${coin.DOGE.TWD}<br>
                            `
                        )
                       
                        // session.replaceDialog('cryto')
                        //=======================回首頁按鈕===========================
                var msg = new builder.Message(session);
                msg.suggestedActions(builder.SuggestedActions.create(
                    session, [builder.CardAction.imBack(session, "回首頁", "回首頁")]
                ));
                session.send(msg);
                // ==========================================================
                    }
                    
                })
            }  
            
    }
]).triggerAction({ matches: /^熱門貨幣$/ }); 

bot.dialog('crypto1', [
    function (session) {
        builder.Prompts.text(session, "請輸入加密貨幣簡寫（ex. BTC）:");
        //=======================推 薦 按 鈕===========================
        var msg = new builder.Message(session);
        msg.suggestedActions(builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "首頁", "🏠首頁"),
                builder.CardAction.imBack(session, "我的最愛", "💖我的最愛"),
                builder.CardAction.imBack(session, "新增最愛", "📁新增最愛"),
                builder.CardAction.imBack(session, "刪除最愛", "🗑️刪除最愛"),
                builder.CardAction.imBack(session, "熱門貨幣", "💰熱門貨幣")
            ]
        ));
        session.send(msg);
        // ==========================================================
    },
    function (session, results) {
        var id = results.response;
        var options = {
            method: "GET",
            url: "https://min-api.cryptocompare.com/data/price",
            //寫在api url ?後面的參數，要放在qs(key)的Json set內
            qs: {
                fsym:id,
                tsyms:"USD,TWD"
                // symbol: id,
                // apikey: "2C8MUXABNVMED4DS"
            },
            //指定json格式的輸出
            json: true
        };
        request(options, function (error, response, body) {
            var coin = body;
            if(coin.Response != "Error"){                 
                session.endDialog(`${id}今日價格如下:<br>USD： ${coin.USD}<br>新台幣：${coin.TWD}`)
                //=======================回首頁按鈕===========================
                var msg = new builder.Message(session);
                msg.suggestedActions(builder.SuggestedActions.create(
                    session, [builder.CardAction.imBack(session, "回首頁", "回首頁")]
                ));
                session.send(msg);
                // ==========================================================
            }else{
                session.endDialog(`沒有找到這個加密貨幣!`)
                //=======================回首頁按鈕===========================
                var msg = new builder.Message(session);
                msg.suggestedActions(builder.SuggestedActions.create(
                    session, [builder.CardAction.imBack(session, "回首頁", "回首頁")]
                ));
                session.send(msg);
                // ==========================================================
            }
        });
    }
])

// bot.dialog('crypto1', [
//     function (session, results) {
//         var id = results.response
//         //=======================回首頁按鈕===========================
//         var msg = new builder.Message(session);
//         msg.suggestedActions(builder.SuggestedActions.create(
//             session, [builder.CardAction.imBack(session, "回首頁", "回首頁")
//             ]
//         ));
//         session.send(msg);
//         // ==========================================================
//         if(id){
//             var options = {
//                 method:"GET",
//                 url: "https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,XRP,XMR,DOGE&tsyms=USD,TWD",           
//                 json:true
//             }
//         }else{
//             var options = {
//                 method:"GET",
//                 url: "https://min-api.cryptocompare.com/data/price", 
//                 //寫在api url ?後面的參數，要放在qs(key)的Json set內
//                 qs:{
//                 fsym: id,
//                 // symbol: id,
//                 tsyms:"USD,TWD",
//                 // apikey:"2C8MUXABNVMED4DS"
//                 }, 
//                 //指定json格式的輸出
//                 json:true
//             }
//         }
//         request(options, function (error, response, body){
//             var coin = body;
//             if(id == "熱門加密貨幣"){
//                 session.endDialog(
//                     `今日熱門貨幣價格如下:<br>比特幣\n:\nUSD:\n${coin.BTC.USD}\n,\nNTD:\n${coin.BTC.TWD}<br>以太幣\n:\nUSD:\n${coin.ETH.USD}\n,\nNTD:\n${coin.ETH.TWD}<br>瑞波幣\n:\nUSD:\n${coin.XRP.USD}\n,\nNTD:\n${coin.XRP.TWD}<br>門羅幣\n:\nUSD:\n${coin.XMR.USD}\n,\nNTD:\n${coin.XMR.TWD}<br>🐕狗幣:\nUSD:\n${coin.DOGE.USD}\n,\nNTD:\n${coin.DOGE.TWD}<br>
//                     `
//                 )
               
//                 // session.replaceDialog('cryto')
//                 //=======================回首頁按鈕===========================
//         var msg = new builder.Message(session);
//         msg.suggestedActions(builder.SuggestedActions.create(
//             session, [builder.CardAction.imBack(session, "回首頁", "回首頁")
//             ]
//         ));
//         session.send(msg);
//         // ==========================================================
//             }else{
//                 if(coin){                 
//                     session.endDialog(`${id}今日價格如下:<br>USD： ${coin.USD}<br>新台幣：${coin.TWD}`)
                    
//                     // session.replaceDialog('crypto')
//                     //=======================回首頁按鈕===========================
//         var msg = new builder.Message(session);
//         msg.suggestedActions(builder.SuggestedActions.create(
//             session, [builder.CardAction.imBack(session, "回首頁", "回首頁")
//             ]
//         ));
//         session.send(msg);
//         // ==========================================================
//                 }else{
//                     session.endDialog(`沒有找到這個加密貨幣!`);
//                 }
//             }
            
//         });
//     }
// ])

//===================(us) 列 印 我 的 最 愛 ===================
bot.dialog('crypto_favorite', [
    function (session) {
        session.send(`![search](http://lincoln.edu.my/design_css/images/ProgressImage.gif)`)
        //設定要查詢sheetDB的資料
        var options = {
            method: "GET",
            url: "https://sheetdb.io/api/v1/5b3a27beea7a1?sheet=coin",
            json: true
        };
        request(options, function (error, response, body) {
            session.dialogData.fav = body;
            session.dialogData.msg = "";
            session.dialogData.count = 0;
            if (!error && response.statusCode == 200) {
                for (var i = 0; i < session.dialogData.fav.length; i++) {
                    showPrice(session.dialogData.fav[i].coin_ticker, session);                    
                }
            }
        });        
    }
]).triggerAction({ matches: /^我的最愛$/ });


//============== 印 出 我 的 最 愛 的 Function ==================
function showPrice(coin_ticker, session) {
    var options = {
        method: "GET",
        url: "https://min-api.cryptocompare.com/data/pricemulti",
        qs: {
            fsym:coin_ticker,
            tsyms:"USD,TWD",
        },
        json: true
    };
    request(options, function (error, response, body) {
        var coin = body;
        if (coin) {            
            var msg = coin_ticker.toUpperCase() + "USD:" + coin.USD + "TWD:" + coin.TWD;       
            // 每次request資料近來，就加到變數 session.dialogData.msg
            session.dialogData.msg += msg+"\n";
            // 每次request資料近來，就紀錄(已完成的次數+1)
            session.dialogData.count += 1;  
            // 當(已完成)次數與session.dialogData.fav.length(我的最愛名單的長度)相同，則執行 1列印 2回到美股首頁
            if (session.dialogData.count == session.dialogData.fav.length) {
                session.send(session.dialogData.msg)
                session.replaceDialog('crypto0');
            }
        } else {
            session.send(`沒有找到${coin_ticker}`);
        }
    });
}


//============= 新 增 加密貨幣 到 我 的 最 愛 ===============
bot.dialog('add_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要新增的加密貨幣:");
    },
    function (session, results) {
        session.dialogData.addTicker = results.response;
        //呼叫addToSheetDB function, 將收到的Ticker存入sheetDB, 
        //column = google試算表的欄位名稱; sheet = googe試算表的工作表名稱; returnDialog = 完成後回到哪個dialog
        addToSheetDB(session.dialogData.addTicker.toUpperCase(), column="coin_ticker", sheet="coin", returnDialog="crypto1", session);
    }
]).triggerAction({ matches: /^新增最愛$/ });


//================ 刪 除 我 的 最 愛 股 票 =================
bot.dialog('del_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要刪除的加密貨幣:");
    },
    function (session, results) {
        session.dialogData.delTicker = results.response;
        //先查詢Ticker是否存在sheetDB
        var options = {
            method: "GET",
            //設定API ID= 5b35ec114e823 ; sheet= googe試算表的工作表名稱
            url: "https://sheetdb.io/api/v1/5b3a27beea7a1?sheet=coin",
            json: true
        };
        request(options, function(error, response, body) {
            session.dialogData.myFav = body;
            session.dialogData.isinside = false;
            // 檢查要刪除的Ticker 是否在sheetDB內(我的最愛), 如果有就刪除Ticker, 沒有就回錯誤訊息
            for (var i =0; i<session.dialogData.myFav.length; i++){
                if (session.dialogData.myFav[i].coin_ticker == session.dialogData.delTicker.toUpperCase()){
                    //呼叫deleteToSheetDB function, 將收到的Ticker從sheetDB刪除
                    //column = google試算表的欄位名稱; sheet = googe試算表的工作表名稱; returnDialog = 完成後回到哪個dialog 
                    session.dialogData.isinside = true;
                    deleteToSheetDB(session.dialogData.delTicker.toUpperCase(), column="coin_ticker", sheet="coin", returnDialog="crypto0", session);
                    break; 
                }
            };
            if (session.dialogData.isinside==false){
                session.send(session.dialogData.delTicker+"不在最愛名單👺");
                session.replaceDialog('crypto0');
            }
        });        
    }
]).triggerAction({ matches: /^刪除最愛$/ });
// #endregion ======美股結束=============================
