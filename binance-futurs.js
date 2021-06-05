const Binance = require('node-binance-api');
const RSI = require('technicalindicators').RSI;
const binance = new Binance().options({
  APIKEY: 'wagFOvABiMvo5VogoReHHdwcMWPTLbq0VL1j5F4OlsPsr5Vecz5GncROrfk1D9Ax',
  APISECRET: '8PLtiRZF4V0DbIRMFuI4FQ9FGz1c4RJub324gUfmgF8XUjVmavhkONK9FIUM8Abx'
});
const timeHistory = 60000 * 5;
const dataHistory = {};
let averagePercentageChangeAllCrypto = [];
let dataPrevDay = [];
let futuresCandleStick1m = [];

binance.futuresMiniTickerStream( miniTicker => {
  miniTicker.forEach(ticker => {
    if(!dataHistory[ticker.symbol]) dataHistory[ticker.symbol] = [];
    dataHistory[ticker.symbol].push({
      time: ticker.eventTime,
      price: ticker.close
    });
    if(!futuresCandleStick1m[ticker.symbol]) {
      futuresCandleStick1m[ticker.symbol] = [];
    }

    // Time history
    let mintimeHistory = dataHistory[ticker.symbol][dataHistory[ticker.symbol].length -1].time - timeHistory;
    dataHistory[ticker.symbol] = dataHistory[ticker.symbol].filter(tick => tick.time > mintimeHistory);
  });
});

binance.websockets.prevDay(false, (error, prevDay) => {
  dataPrevDay[prevDay.symbol] = prevDay;
});

(async function candleSticks1m() {
  let allSymbols = (await binance.futuresExchangeInfo()).symbols.map(info => info.symbol);

  binance.websockets.candlesticks(allSymbols, "1m", (candlesticks) => {
    let { e:eventType, E:eventTime, s:symbol, k:ticks } = candlesticks;
    let { o:open, h:high, l:low, c:close, v:volume, n:trades, i:interval, x:isFinal, q:quoteVolume, V:buyVolume, Q:quoteBuyVolume } = ticks;
    if(isFinal) {
      if(!futuresCandleStick1m[symbol]) {
        futuresCandleStick1m[symbol] = [];
      }
      futuresCandleStick1m[symbol].push(close);
      futuresCandleStick1m[symbol].slice(-500);
    }
  });
})();


exports.getData = function(cb) {
  setInterval(() => {
    let data = { table : [], markets: [] };
    Object.keys(dataPrevDay).forEach((symbol) => {
      data.markets.push(dataPrevDay[symbol]);
    });
    Object.keys(dataHistory).forEach((symbol) => {
      data.table.push({
        'symbol': symbol,
        'timeStart': dataHistory[symbol][0].time,
        'timeEnd': dataHistory[symbol][dataHistory[symbol].length -1].time,
        'percentageChange': (Math.round(
          ((100 - dataHistory[symbol][0].price * 100 / dataHistory[symbol][dataHistory[symbol].length -1].price) + Number.EPSILON) * 100
        ) / 100),
        'RSI': RSI.calculate({
          values: futuresCandleStick1m[symbol] || [],
          period: 15
        })
      });
    });
    averagePercentageChangeAllCrypto.push({
      'x': Date.now(),
      'y': data.table.reduce( function(a, b){
        return a + b['percentageChange'];
      }, 0) / data.table.length
    });
    averagePercentageChangeAllCrypto = averagePercentageChangeAllCrypto.slice(-40000);

    cb({
      ...data,
      averagePercentageChangeAllCrypto
    });
  }, 2000);
}
