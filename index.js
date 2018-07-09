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
        builder.Prompts.choice(session, "請問要查詢什麼?", ["歐股", "台股", "金屬", "加密貨幣"], { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.dialogData.ask = results.response.entity;
        if (session.dialogData.ask == "美股")
            session.replaceDialog('us');
        else if (session.dialogData.ask == "金屬")
            session.replaceDialog('metal');
        else if (session.dialogData.ask == "加密貨幣")
            session.replaceDialog('crypto1');
        else if (session.dialogData.ask == "歐股")
            session.replaceDialog('euro');
        else if (session.dialogData.ask == "台股")
            session.replaceDialog('tw');
        // TODO 加入每個人寫的功能
    }
]).triggerAction({ matches: /^首頁$/ }); //任何時間打入"回首頁"都可以回到此Dialog
// #endregion 首頁#endregion 首頁
// #region 共用的sheetDB function 勿改!!===============
//=========== function 新增Ticker sheetDB =================
function addToSheetDB(ticker, column, sheet, returnDialog, session) {
    // 設定要加入到SheetDB的欄位名(colume), 與儲存內容(ticker)
    var body_data = `[{"${column}" : "${ticker}"}]`;
    request({
        uri: 'https://sheetdb.io/api/v1/5b35ec114e823?sheet='+sheet,
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
        uri: 'https://sheetdb.io/api/v1/5b35ec114e823/'+column +'/'+ ticker +'?sheet='+ sheet,
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

//===================(us) 列 印 我 的 最 愛 ===================
bot.dialog('us_favorite', [
    function (session) {
        session.send(`![search](http://lincoln.edu.my/design_css/images/ProgressImage.gif)`)
        //設定要查詢sheetDB的資料
        var options = {
            method: "GET",
            url: "https://sheetdb.io/api/v1/5b35ec114e823?sheet=us",
            json: true
        };
        request(options, function (error, response, body) {
            session.dialogData.fav = body;
            session.dialogData.msg = "";
            session.dialogData.count = 0;
            if (!error && response.statusCode == 200) {
                for (var i = 0; i < session.dialogData.fav.length; i++) {
                    showPrice(session.dialogData.fav[i].usticker, session);                    
                }
            }
        });        
    }
]).triggerAction({ matches: /^我的最愛$/ });


//============== 印 出 我 的 最 愛 的 Function ==================
function showPrice(usticker, session) {
    var options = {
        method: "GET",
        url: "https://www.alphavantage.co/query",
        qs: {
            function: "TIME_SERIES_DAILY",
            symbol: usticker,
            apikey: "2C8MUXABNVMED4DS"
        },
        json: true
    };
    request(options, function (error, response, body) {
        var stock = body;
        if (stock["Time Series (Daily)"]) {
            var date = JSON.stringify(stock["Time Series (Daily)"]).match(/\d{4}-\d{2}-\d{2}/g);
            var close = parseFloat(stock["Time Series (Daily)"][date[0]]["4. close"]).toFixed(2);
            var change = parseFloat(stock["Time Series (Daily)"][date[0]]["4. close"]-stock["Time Series (Daily)"][date[1]]["4. close"]).toFixed(2)
            var changePercent = parseFloat((stock["Time Series (Daily)"][date[0]]["4. close"]-stock["Time Series (Daily)"][date[1]]["4. close"])/stock["Time Series (Daily)"][date[1]]["4. close"]*100).toFixed(2)
            var msg = usticker.toUpperCase() + " close $" + close + " change $" + change + "(" + changePercent +"%)";       
            // 每次request資料近來，就加到變數 session.dialogData.msg
            session.dialogData.msg += msg+"\n";
            // 每次request資料近來，就紀錄(已完成的次數+1)
            session.dialogData.count += 1;  
            // 當(已完成)次數與session.dialogData.fav.length(我的最愛名單的長度)相同，則執行 1列印 2回到美股首頁
            if (session.dialogData.count == session.dialogData.fav.length) {
                session.send(session.dialogData.msg)
                session.replaceDialog('us');
            }
        } else {
            session.send(`沒有找到${usticker}`);
        }
    });
}


//============= 新 增 股 票 到 我 的 最 愛 ===============
bot.dialog('add_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要新增的美股:");
    },
    function (session, results) {
        session.dialogData.addTicker = results.response;
        //呼叫addToSheetDB function, 將收到的Ticker存入sheetDB, 
        //column = google試算表的欄位名稱; sheet = googe試算表的工作表名稱; returnDialog = 完成後回到哪個dialog
        addToSheetDB(session.dialogData.addTicker.toUpperCase(), column="usticker", sheet="us", returnDialog="us", session);
    }
]).triggerAction({ matches: /^新增最愛$/ });


//================ 刪 除 我 的 最 愛 股 票 =================
bot.dialog('del_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要刪除的美股:");
    },
    function (session, results) {
        session.dialogData.delTicker = results.response;
        //先查詢Ticker是否存在sheetDB
        var options = {
            method: "GET",
            //設定API ID= 5b35ec114e823 ; sheet= googe試算表的工作表名稱
            url: "https://sheetdb.io/api/v1/5b35ec114e823?sheet=us",
            json: true
        };
        request(options, function (error, response, body) {
            session.dialogData.myFav = body;
            // 檢查要刪除的Ticker 是否在sheetDB內(我的最愛), 如果有就刪除Ticker, 沒有就回錯誤訊息
            for (var i =0; i<session.dialogData.myFav.length; i++){
                if (session.dialogData.myFav[i].usticker == session.dialogData.delTicker){
                    //呼叫deleteToSheetDB function, 將收到的Ticker從sheetDB刪除
                    //column = google試算表的欄位名稱; sheet = googe試算表的工作表名稱; returnDialog = 完成後回到哪個dialog
                    deleteToSheetDB(session.dialogData.delTicker.toUpperCase(), column="usticker", sheet="us", returnDialog="us", session); 
                }
            }
            session.send(session.dialogData.delTicker+"不在最愛名單")
            session.replaceDialog('us')
        });        
    }
]).triggerAction({ matches: /^刪除最愛$/ });
// #endregion ======美股結束=============================

// 金屬

bot.dialog('metal', [
    function (session) {
        builder.Prompts.choice(session, "請選擇您想知道的金屬？", "GC|HG|SI|PL|PA", { listStyle: builder.ListStyle.button });
        
        // TODO 提供一個trigger event, 讓使用者可以回到首頁選單
        //=======================回首頁按鈕===========================
        var msg = new builder.Message(session);
        msg.suggestedActions(builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "首頁", "🏦首頁"),
                builder.CardAction.imBack(session, "我的最愛金屬", "💗我的最愛金屬"),
                builder.CardAction.imBack(session, "新增最愛金屬", "💘新增最愛金屬"),
                builder.CardAction.imBack(session, "刪除最愛金屬", "💔刪除最愛金屬"),
                builder.CardAction.imBack(session, "投顧老師", "🤞投顧老師")
            ]
        ));
        session.send(msg);
        // ==========================================================
    },
    function (session, results) {
        var metal_name = results.response.entity;
        // 利用選擇的Name完成API
        var metal_url = "https://www.quandl.com/api/v3/datasets/CHRIS/CME_" + metal_name + "1.json";
        var options = {
        method: "GET",
        url: metal_url,
        // 寫在api url ?後面的參數，要放在qs(key)的Json set內
        qs:{
            api_key:"sae2Txxu_kQTHFHDxyjr"
        }, 
        // 指定json格式的輸出
        json: true
        }
        request(options, function (error, response, body) {
            var m_body = body;
            // TODO:用RegExpression,找出JSON檔第一筆日期的資料,可以避免節慶日找不到資料
            // var getDate = JSON.stringify(gold["dataset"]["data"][0]).match(/\d{4}-\d{2}-\d{2}/);
            var getDate = m_body["dataset"]["data"][0][0];
            var getOpen = m_body["dataset"]["data"][0][1];
            var getHigh = m_body["dataset"]["data"][0][2];
            var getLow  = m_body["dataset"]["data"][0][3];
            var getLast = m_body["dataset"]["data"][0][4];
            session.endDialog(`Name ${metal_name} \nDate ${getDate} \nopen $${getOpen} \nhigh $${getHigh} \nlow $${getLow} \nLast $${getLast}`);
            session.replaceDialog('metal');
            // TODO 讓request資料已經完成後，才執行session.replaceDialog
        });
    }
]);

//=================== 列 印 我 的 最 愛 ===================
bot.dialog('metal_favorite', [
    function (session) {
        var options = {
            method: "GET",
            // sheetdb api
            url: "https://sheetdb.io/api/v1/5b3606b4e4fa2",
            // 指定json格式的輸出
            json: true
        };
        request(options, function (error, response, body) {
            session.dialogData.fav = body;
            session.dialogData.msg = "";
            session.dialogData.count = 0;
            if (!error && response.statusCode == 200) {
                for (var i = 0; i < session.dialogData.fav.length; i++) {
                    showMetalPrice(session.dialogData.fav[i].MetalName, session);
                }
            }
        });        
    }
]).triggerAction({ matches: /^我的最愛金屬$/ });


//============== 印 出 我 的 最 愛 最 新 收 盤 價==================
function showMetalPrice(MetalName, session) {
    console.log("beforeRequest: " + MetalName);
    // 各個金屬api
    var metal_url = "https://www.quandl.com/api/v3/datasets/CHRIS/CME_" + MetalName + "1.json";
    var options = {
        method: "GET",
        url: metal_url,
        qs: {
            api_key: "sae2Txxu_kQTHFHDxyjr"
        },
        json: true
    };
    request(options, function (error, response, body) {
        var m_body = body;
        // TODO:用RegExpression,找出JSON檔第一筆日期的資料,可以避免節慶日找不到資料
        // var getDate = JSON.stringify(gold["dataset"]["data"][0]).match(/\d{4}-\d{2}-\d{2}/);
        var getDate = m_body["dataset"]["data"][0][0];
        var getLast = m_body["dataset"]["data"][0][4];
        var msg = MetalName + " " + getDate + "Last $" + getLast
        // 每次request資料近來，就加到變數 session.dialogData.msg
        session.dialogData.msg += msg+"\n";
        // 每次request資料近來，就紀錄(已完成的次數+1)
        session.dialogData.count += 1;
        if(session.dialogData.count == session.dialogData.fav.length)
        {
            session.send(session.dialogData.msg);
            session.replaceDialog('metal');
        }
        // session.endDialog(`${MetalName} ${getDate} Last $${getLast}`);
        // session.replaceDialog('metal');
        // TODO 讓request資料已經完成後，才執行session.replaceDialog
    });
}

//=========== 新 增 到 我 的 最 愛 =============
bot.dialog('metal_add_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要新增的金屬: ");
    },
    function (session, results) {
        session.dialogData.addus = results.response;
        addToMetalSheetDB(session.dialogData.addus, session);

    }
]).triggerAction({ matches: /^新增最愛金屬$/ });


//========== === 刪 除 我 的 最 愛 =============
bot.dialog('metal_del_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要刪除的金屬: ");
    },
    function (session, results) {
        session.dialogData.deleteus = results.response;
        deleteToMetalSheetDB(session.dialogData.deleteus, session);
    }
]).triggerAction({ matches: /^刪除最愛金屬$/ });

//=========== function 新增 sheetDB =================
function addToMetalSheetDB(MetalName, session) {
    console.log("addToMetalSheetDB" + MetalName);
    request({
        uri: 'https://sheetdb.io/api/v1/5b3606b4e4fa2',
        json: true,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
            "data": [{
                "MetalName": MetalName
            }]
        }
    }, function (error, response, body) {
        if (!error && response.statusCode == 201) {
            session.send("儲存成功");
            session.replaceDialog('metal');
        } else {
            console.log(error)
        }
    });
}

//=========== function 刪除 sheetDB =================
function deleteToMetalSheetDB(MetalName, session) {
    console.log("addToMetalSheetDB" + MetalName);
    request({
        uri: 'https://sheetdb.io/api/v1/5b3606b4e4fa2/MetalName/' + MetalName,
        json: true,
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            session.send("刪除成功");
            session.replaceDialog('metal');
        } else {
            console.log(error)
        }
    });
}
//===================================================


function addcrypto1ToSheetDB(ticker, column, sheet, returnDialog, session) {
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
function deletecrypto1ToSheetDB(ticker, column, sheet, returnDialog, session) {
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

bot.dialog('crypto0', [
    
    function (session, results) {
        // session.send(`![search](https://media.giphy.com/media/l0HUpt2s9Pclgt9Vm/giphy.gif)`)
        session.dialogData = results.response
         
            if(true){
                var options = {
                    method:"GET",
                    url: "https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,XRP,XMR,DOGE&tsyms=USD,TWD",           
                    json:true
                }
                

                request(options, function (error, response, body){
                    session.send(`![doge](https://media.giphy.com/media/5xtDarJ7d5HXTRULbSo/giphy.gif)`)
                    var coin = body;
                    if(coin){
                        session.endDialog(
                            `今日熱門貨幣價格如下:<br>比特幣:USD: ${coin.BTC.USD} , NTD: ${coin.BTC.TWD}<br>以太幣 : USD: ${coin.ETH.USD} , NTD: ${coin.ETH.TWD}<br>瑞波幣 : USD: ${coin.XRP.USD} , NTD: ${coin.XRP.TWD}<br>門羅幣 : USD: ${coin.XMR.USD} , NTD: ${coin.XMR.TWD}<br>🐕狗幣: USD: ${coin.DOGE.USD} , NTD: ${coin.DOGE.TWD}<br>
                            `
                        )
                       
                        // session.replaceDialog('cryto')
                        //=======================回首頁按鈕===========================
                var msg = new builder.Message(session);
                msg.suggestedActions(builder.SuggestedActions.create(
                    session, [builder.CardAction.imBack(session, "回首頁", "回首頁")]
                ));
                session.send(msg);
                session.replaceDialog('crypto1')
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
                builder.CardAction.imBack(session, "我的最愛貨幣", "💖我的最愛貨幣"),
                builder.CardAction.imBack(session, "新增最愛貨幣", "📁新增最愛貨幣"),
                builder.CardAction.imBack(session, "刪除最愛貨幣", "🗑️刪除最愛貨幣"),
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
                session.replaceDialog('crypto1')
            }else{
                session.endDialog(`沒有找到這個加密貨幣!`)
                session.replaceDialog('crypto1')
            }
        });
    }
])



//===================(us) 列 印 我 的 最 愛 ===================
bot.dialog('crypto_favorite', [
    function (session) {
        session.send(`![search](https://media.giphy.com/media/l0HUpt2s9Pclgt9Vm/giphy.gif)`)
        //設定要查詢sheetDB的資料
        var options = {
            method: "GET",
            url: "https://sheetdb.io/api/v1/5b3a27beea7a1?sheet=coin",
            json: true
        };
        request(options, function (error, response, body) {
            session.dialogData.fav = body;
            session.dialogData.tickerlist = "";
            //------------------^^^^^^^^^^ fix (error:msg)
            session.dialogData.count = 0;
            if (!error && response.statusCode == 200) {
                for (var i = 0; i < session.dialogData.fav.length; i++) {
                    //============
                    session.dialogData.tickerlist += session.dialogData.fav[i].coin_ticker+",";
                    //===========
                }
                console.log("==============tickerlist: "+session.dialogData.tickerlist);
                showcrypto1Price(session.dialogData.tickerlist, session)
            }
        });        
    }
]).triggerAction({ matches: /^我的最愛貨幣$/ });


//============== 印 出 我 的 最 愛 的 Function ==================
function showcrypto1Price(tickers, session) {
    var options = {
        method: "GET",
        url: "https://min-api.cryptocompare.com/data/pricemulti",
        qs: {
            fsyms:tickers,
            tsyms:"USD,TWD",
        },
        json: true
    };
    request(options, function (error, response, body) {
        var coin = body;
        console.log("****************coin"+coin.BTC.USD)
        var msg = "";
        if (coin) {
            for (var i = 0; i < session.dialogData.fav.length; i++) {
                ticker = session.dialogData.fav[i].coin_ticker;
                msg += ticker+" : USD : "+ coin[ticker].USD + " ,新台幣 : " + coin[ticker].TWD + "<br>";
            }
            session.send(msg);
            session.replaceDialog('crypto1');
        } else {
            session.send(`沒有找到${coin_ticker}`)
            session.replaceDialog('crypto1');
        }
    });
}


//============= 新 增 加密貨幣 到 我 的 最 愛 ===============
bot.dialog('addcrypto1_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要新增的加密貨幣:");
    },
    function (session, results) {
        session.dialogData.addTicker = results.response;
        //呼叫addcrypto1ToSheetDB function, 將收到的Ticker存入sheetDB, 
        //column = google試算表的欄位名稱; sheet = googe試算表的工作表名稱; returnDialog = 完成後回到哪個dialog
        addcrypto1ToSheetDB(session.dialogData.addTicker.toUpperCase(), column="coin_ticker", sheet="coin", returnDialog="crypto1", session);
    }
]).triggerAction({ matches: /^新增最愛貨幣$/ });


//================ 刪 除 我 的 最 愛 股 票 =================
bot.dialog('delcrypto1_favorite', [
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
                    //呼叫deletecrypto1ToSheetDB function, 將收到的Ticker從sheetDB刪除
                    //column = google試算表的欄位名稱; sheet = googe試算表的工作表名稱; returnDialog = 完成後回到哪個dialog 
                    session.dialogData.isinside = true;
                    deletecrypto1ToSheetDB(session.dialogData.delTicker.toUpperCase(), column="coin_ticker", sheet="coin", returnDialog="crypto0", session);
                    break; 
                }
            };
            if (session.dialogData.isinside==false){
                session.send(session.dialogData.delTicker+"不在最愛名單👺");
                session.replaceDialog('crypto0');
            }
        });        
    }
]).triggerAction({ matches: /^刪除最愛貨幣$/ });
// #endregion ======美股結束=============================


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
                    showeuroPrice(session.dialogData.fav[i].euroName, session);                    
                }
            }
        });        
    }
]).triggerAction({ matches: /^我的最愛歐股$/ });

//============== 印 出 我 的 最 愛 的 Function ==================
function showeuroPrice(euroName, session) {
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


function addtwToSheetDB(ticker, column, sheet, returnDialog, session) {
    // 設定要加入到SheetDB的欄位名(colume), 與儲存內容(ticker)
    var body_data = `[{"${column}" : "${ticker}"}]`;
    request({
        uri: 'https://sheetdb.io/api/v1/5b3b3ece2cfba?sheet='+sheet,
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
function deletetwToSheetDB(ticker, column, sheet, returnDialog, session) {
    request({
        // 設定要加入到SheetDB的欄位名(colume), 與儲存內容(ticker)
        uri: 'https://sheetdb.io/api/v1/5b3b3ece2cfba/'+column +'/'+ ticker +'?sheet='+ sheet,
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
// #region ===================== (tw) 台 股 首 頁 ==============================
bot.dialog('tw', [
    function (session) {
        builder.Prompts.text(session, "請輸入台股代碼:");
        //=======================推 薦 按 鈕===========================
        var msg = new builder.Message(session);
        msg.suggestedActions(builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "首頁", "🏠首頁"),
                builder.CardAction.imBack(session, "我的最愛台股", "💖我的最愛台股"),
                builder.CardAction.imBack(session, "新增最愛台股", "📁新增最愛台股"),
                builder.CardAction.imBack(session, "刪除最愛台股", "🗑️刪除最愛台股")
            ]
        ));
        session.send(msg);
        // ==========================================================
    },
    function (session, results) {
        var id = results.response;
        var options = { 
            method: "GET",
            url: "http://www.twse.com.tw/exchangeReport/STOCK_DAY",
            //寫在api url ?後面的參數，要放在qs(key)的Json set內
            qs: {
                response:"json",
                stockNo: id
                //apikey: "#"
            },
            //指定json格式的輸出
            json: true
        }
        request(options, function (error, response, body) {
            var stock = body;
            if (stock.stat == "OK") {
                session.send(`股票代號:${id}
                股票名稱:${stock.title.substr(13,14)}
                日期:${stock.data[stock.data.length-1][0]}
                成交股數:${stock.data[stock.data.length-1][1]}
                成交金額:${stock.data[stock.data.length-1][2]}
                開盤價:${stock.data[stock.data.length-1][3]}
                最高價:${stock.data[stock.data.length-1][4]}
                最低價:${stock.data[stock.data.length-1][5]}
                收盤價:${stock.data[stock.data.length-1][6]}
                漲跌價差:${stock.data[stock.data.length-1][7]}
                成交筆數:${stock.data[stock.data.length-1][8]}`);
                session.replaceDialog('tw');
            } else {
                session.send(`沒有找到這個股票!`);
                session.replaceDialog('tw');
            }
        });
    }
])

//===================(tw) 列 印 我 的 最 愛 ===================
bot.dialog('tw_favorite', [
    function (session) {
        session.send(`![search](https://media0.giphy.com/media/ADgfsbHcS62Jy/giphy.gif)`)
        //設定要查詢sheetDB的資料
        var options = {
            method: "GET",
            url: "https://sheetdb.io/api/v1/5b3b3ece2cfba?sheet=tw",
            json: true
        };
        request(options, function (error, response, body) {
            session.dialogData.fav = body;
            session.dialogData.msg = "";
            session.dialogData.count = 0;
            if (!error && response.statusCode == 200) {
                for (var i = 0; i < session.dialogData.fav.length; i++) {
                    showtwPrice(session.dialogData.fav[i].twticker, session);                    
                }
            }
        });        
    }
]).triggerAction({ matches: /^我的最愛台股$/ });


//============== 印 出 我 的 最 愛 的 Function ==================
function showtwPrice(twticker, session) {
    var options = {
        method: "GET",
        url: "http://www.twse.com.tw/exchangeReport/STOCK_DAY",
        qs: {
            // function: "TIME_SERIES_DAILY",
            // symbol: twticker,
            response:"json",
            stockNo: twticker
            //apikey: "2C8MUXABNVMED4DS"
        },
        json: true
    };
    request(options, function (error, response, body) {
        var stock = body;
        console.log("==============")
        console.log(stock)
        console.log("==============")
        if (stock) {
            var date = stock["data"][0][0];
            var close = stock["data"][0][6];            
            
            var msg = twticker + "<br>" + "日期" + date + "<br>" + " close $" + close;       
            // 每次request資料近來，就加到變數 session.dialogData.msg
            session.dialogData.msg += msg+"\n";
            // 每次request資料近來，就紀錄(已完成的次數+1)
            session.dialogData.count += 1;  
            // 當(已完成)次數與session.dialogData.fav.length(我的最愛名單的長度)相同，則執行 1列印 2回到台股首頁
            if (session.dialogData.count == session.dialogData.fav.length) {
                session.send(session.dialogData.msg)
                session.replaceDialog('tw');
            }
        } else {
            session.send(`沒有找到${twticker}`);
        }
    });
}


//============= 新 增 股 票 到 我 的 最 愛 ===============
bot.dialog('addtw_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要新增的台股:");
    },
    function (session, results) {
        session.dialogData.addTicker = results.response;
        //呼叫addtwToSheetDB function, 將收到的Ticker存入sheetDB, 
        //column = google試算表的欄位名稱; sheet = googe試算表的工作表名稱; returnDialog = 完成後回到哪個dialog
        addtwToSheetDB(session.dialogData.addTicker.toUpperCase(), column="twticker", sheet="tw", returnDialog="tw", session);
    }
]).triggerAction({ matches: /^新增最愛台股$/ });


//================ 刪 除 我 的 最 愛 股 票 =================
bot.dialog('deltw_favorite', [
    function (session) {
        builder.Prompts.text(session, "請輸入要刪除的台股:");
    },
    function (session, results) {
        session.dialogData.delTicker = results.response;
        //先查詢Ticker是否存在sheetDB
        var options = {
            method: "GET",
            //設定API ID= 5b35ec114e823 ; sheet= googe試算表的工作表名稱
            url: "https://sheetdb.io/api/v1/5b3b3ece2cfba?sheet=tw",
            json: true
        };
        request(options, function(error, response, body) {
            session.dialogData.myFav = body;
            session.dialogData.isinside = false;
            // 檢查要刪除的Ticker 是否在sheetDB內(我的最愛), 如果有就刪除Ticker, 沒有就回錯誤訊息
            for (var i =0; i<session.dialogData.myFav.length; i++){
                if (session.dialogData.myFav[i].twticker == session.dialogData.delTicker.toUpperCase()){
                    //呼叫deletetwToSheetDB function, 將收到的Ticker從sheetDB刪除
                    //column = google試算表的欄位名稱; sheet = googe試算表的工作表名稱; returnDialog = 完成後回到哪個dialog 
                    session.dialogData.isinside = true;
                    deletetwToSheetDB(session.dialogData.delTicker.toUpperCase(), column="twticker", sheet="tw", returnDialog="tw", session);
                    break; 
                }
            };
            if (session.dialogData.isinside==false){
                session.send(session.dialogData.delTicker+"不在最愛名單👺");
                session.replaceDialog('tw');
            }
        });        
    }
]).triggerAction({ matches: /^刪除最愛台股$/ });
// #endregion ======股結束=============================


bot.dialog('metal_care', [
    function(session) {
        session.dialogData.cares = {};        
        session.send('請先回答以下問題好為您推薦符合您需求的投顧老師');
        builder.Prompts.choice(session, "請問您希望的老師性別?", "男|女|皆可", { listStyle: builder.ListStyle.button });
    },
    function( session, results) {
        session.dialogData.cares.gender = results.response.entity;
        builder.Prompts.choice(session, "請問您希望的老師特征?", "情緒型|理智型|意志型", { listStyle: builder.ListStyle.button });
    },
    function( session, results) {
        session.dialogData.cares.feature = results.response.entity;
        builder.Prompts.choice(session, "請問您能接受的投資風險?", "高|中|低", { listStyle: builder.ListStyle.button });
    },
    function(session, results) {
        session.send('請稍等，馬上為您配對');
        session.dialogData.cares.risk = results.response.entity;        
        session.endDialogWithResult({
            response:session.dialogData.cares
        });
    }
])


bot.dialog('recommend', [
    function(session) {
        session.send('需要為您推薦投顧老師嗎?');
        session.beginDialog('metal_care');
    },
    function(session, results) {
        cares = results.response;
        // 把cares 設定為全域變數ai
        session.userData.ai = cares;
        var msg = new  builder.Message(session);
        var attachmant = new builder.ReceiptCard(session)
        .title("您的選擇條件")
        .facts([
            builder.Fact.create(session, cares.gender, "老師性別"),
            builder.Fact.create(session, cares.feature, "老師特征"),
            builder.Fact.create(session, cares.risk, "投資風險")
        ])
        msg.addAttachment(attachmant);        
        session.endConversation(msg);
        session.replaceDialog("fraction", {reprompt:false});
    }    
]).triggerAction({ matches: /^投顧老師$/ });


bot.dialog('fraction', [
    function(session, results) {
        console.log(session.userData.ai)
        if(session.userData.ai.gender == '男') {            
            var msg = new builder.Message(session);
            var heroCard = new builder.HeroCard(session)
                .title("唐納·川普")
                .subtitle("整個FinTastic都是我的嘴砲天堂！")
                .text("只有戰爭才可以凸顯金屬的價值")
                .images([builder.CardImage.create(session, "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSAe5Upa0wWAamXePPlfW0VXofOr86AIjIoWpSl0UVNIWFKgcx3PA")])
                .buttons([
                    builder.CardAction.openUrl(session, "https://clickme.net/39108","超狂名言")
                ]);
            msg.addAttachment(heroCard);
            session.endDialog(msg);
            session.replaceDialog('metal');
        } else if(session.userData.ai.gender == '女') {
            var msg = new builder.Message(session);
            var heroCard = new builder.HeroCard(session)
                .title("宋智孝")
                .subtitle("整個Running Man都是我的黃金(手)！")
                .text("只有勝利才有金屬")
                .images([builder.CardImage.create(session, "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS8glXbGlvwr5Vobct2MUIEJYacoz6WMATNobsoU5YLCWILmP69")])
                .buttons([
                    builder.CardAction.openUrl(session, "https://www.youtube.com/watch?v=4TnkMfAQmP0","黃金獎勵")
                ]);
            msg.addAttachment(heroCard);
            session.endDialog(msg);
            session.replaceDialog('metal');
        } else {
            var msg = new builder.Message(session);
            var heroCard = new builder.HeroCard(session)
                .title("娜美")
                .subtitle("整個One Piece都是我的黃金之旅！")
                .text("我只喜歡黃金跟橘子")
                .images([builder.CardImage.create(session, "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCZOaXpm8UnMtknPk39HASYBFWz2-mO_3aqa2B-cnMv0VadGMd")])
                .buttons([
                    builder.CardAction.openUrl(session, "https://www.youtube.com/watch?v=pATTYJ10Q9M","為黃金瘋狂")
                ]);
            msg.addAttachment(heroCard);
            session.endDialog(msg);
            session.replaceDialog('metal');
        }
    }
])
