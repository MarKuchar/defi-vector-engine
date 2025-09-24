import fs from 'fs/promises';
import path from 'path';

async function main() {
  // Load backtest results
  const backtestFilePath = path.resolve(__dirname, '../../data/backtest_sol.json');
  const backtestRaw = await fs.readFile(backtestFilePath, 'utf8');
  const backtestData = JSON.parse(backtestRaw);

  // Load historical price data
  const historicalFilePath = path.resolve(__dirname, '../../data/historical_sol_1m.json');
  const historicalRaw = await fs.readFile(historicalFilePath, 'utf8');
  const historicalData = JSON.parse(historicalRaw);

  // ----------------- Data Preparation -----------------
  const timestamps = backtestData.equityCurve.map((p: any) => new Date(p.timestamp));
  const equity = backtestData.equityCurve.map((p: any) => p.equity);
  
  const initialEquity = equity[0] || 1;
  const returnsPct = equity.map((e: number) => ((e / initialEquity - 1) * 100).toFixed(4));

  const buyTrades = backtestData.trades.filter((t: any) => t.direction === 'LONG');
  const sellTrades = backtestData.trades.filter((t: any) => t.direction === 'CLOSE');

  const findEquityAtTime = (timestamp: number) => {
    const point = backtestData.equityCurve.find((p: any) => p.timestamp === timestamp);
    return point ? point.equity : null;
  };

  const buyEquity = buyTrades.map((t: any) => findEquityAtTime(t.timestamp));
  const sellEquity = sellTrades.map((t: any) => findEquityAtTime(t.timestamp));

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>SOL Backtest Analysis</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      .stats { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
      .stat-item { margin: 5px 0; }
      .chart-container { margin-bottom: 30px; }
    </style>
  </head>
  <body>
    <h1>SOL Backtest Analysis</h1>
    
    <div class="stats">
      <div class="stat-item"><strong>Initial Equity:</strong> $${equity[0].toFixed(2)}</div>
      <div class="stat-item"><strong>Final Equity:</strong> $${equity[equity.length - 1].toFixed(2)}</div>
      <div class="stat-item"><strong>Total Return:</strong> $${(equity[equity.length - 1] - equity[0]).toFixed(2)} (${returnsPct[returnsPct.length - 1]}%)</div>
      <div class="stat-item"><strong>Total Trades:</strong> ${backtestData.trades.length}</div>
      <div class="stat-item"><strong>Buy Signals:</strong> ${buyTrades.length}</div>
      <div class="stat-item"><strong>Sell Signals:</strong> ${sellTrades.length}</div>
    </div>

    <div class="chart-container">
      <div id="equityChart" style="width:100%;height:400px;"></div>
    </div>
    
    <div class="chart-container">
      <div id="returnsChart" style="width:100%;height:300px;"></div>
    </div>

    <div class="chart-container">
      <div id="priceChart" style="width:100%;height:400px;"></div>
    </div>
    
    <script>
      // ----------------- Equity Curve Chart with Trade Markers -----------------
      const equityTrace = {
        x: ${JSON.stringify(timestamps)},
        y: ${JSON.stringify(equity)},
        mode: 'lines',
        name: 'Equity Curve',
        line: {color: '#2E86AB', width: 2}
      };

      const buyTrace = {
        x: ${JSON.stringify(buyTrades.map((t: any) => new Date(t.timestamp)))},
        y: ${JSON.stringify(buyEquity)},
        mode: 'markers',
        name: 'BUY Signal',
        marker: {
          color: 'green',
          symbol: 'triangle-up',
          size: 12,
          line: {color: 'white', width: 1}
        }
      };

      const sellTrace = {
        x: ${JSON.stringify(sellTrades.map((t: any) => new Date(t.timestamp)))},
        y: ${JSON.stringify(sellEquity)},
        mode: 'markers',
        name: 'SELL Signal',
        marker: {
          color: 'red',
          symbol: 'triangle-down',
          size: 12,
          line: {color: 'white', width: 1}
        }
      };

      Plotly.newPlot('equityChart', [equityTrace, buyTrace, sellTrace], {
        title: 'Equity Curve with Trade Signals',
        xaxis: {title: 'Time'},
        yaxis: {title: 'Equity ($)', tickformat: '$,.2f'},
        hovermode: 'closest',
        showlegend: true
      });

      // ----------------- Returns Chart (Percentage) -----------------
      const returnsTrace = {
        x: ${JSON.stringify(timestamps)},
        y: ${JSON.stringify(returnsPct)},
        mode: 'lines',
        name: 'Returns (%)',
        line: {color: '#A23B72', width: 1.5}
      };

      Plotly.newPlot('returnsChart', [returnsTrace], {
        title: 'Percentage Returns',
        xaxis: {title: 'Time'},
        yaxis: {title: 'Return (%)', ticksuffix: '%', range: [-0.1, 0.1]},
        shapes: [{
          type: 'line',
          x0: timestamps[0],
          y0: 0,
          x1: timestamps[timestamps.length - 1],
          y1: 0,
          line: {color: 'red', width: 1, dash: 'dash'}
        }],
        hovermode: 'closest'
      });

      // ----------------- Corrected Price Chart with Trades -----------------
      const historicalCandles = ${JSON.stringify(historicalData)};

      const priceTrace = {
        x: historicalCandles.map(c => new Date(c.timestamp)),
        y: historicalCandles.map(c => c.close),
        mode: 'lines',
        name: 'SOL Price',
        line: {color: '#007BFF', width: 1}
      };

      const priceBuyTrace = {
        x: ${JSON.stringify(buyTrades.map((t: any) => new Date(t.timestamp)))},
        y: ${JSON.stringify(buyTrades.map((t: any) => t.price))},
        mode: 'markers',
        name: 'BUY Price',
        marker: {
          color: 'green',
          symbol: 'triangle-up',
          size: 12
        }
      };

      const priceSellTrace = {
        x: ${JSON.stringify(sellTrades.map((t: any) => new Date(t.timestamp)))},
        y: ${JSON.stringify(sellTrades.map((t: any) => t.price))},
        mode: 'markers',
        name: 'SELL Price',
        marker: {
          color: 'red',
          symbol: 'triangle-down',
          size: 12
        }
      };

      Plotly.newPlot('priceChart', [priceTrace, priceBuyTrace, priceSellTrace], {
        title: 'SOL Price with Trade Signals',
        xaxis: {title: 'Time'},
        yaxis: {title: 'Price ($)', tickformat: '$,.2f'},
        hovermode: 'closest'
      });
    </script>
  </body>
  </html>
  `;

  const outFile = path.resolve(__dirname, '../../data/backtest_analysis.html');
  await fs.writeFile(outFile, html);
  console.log(`✅ Enhanced analysis saved to ${outFile}`);
  console.log(`📊 Total equity change: $${(equity[equity.length - 1] - equity[0]).toFixed(4)} (${returnsPct[returnsPct.length - 1]}%)`);
}

main().catch(console.error);