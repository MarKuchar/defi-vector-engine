import fs from 'fs/promises';
import path from 'path';

async function main() {
  const filePath = path.resolve(__dirname, '../../data/backtest_sol.json');
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw);

  const timestamps = data.equityCurve.map((p: any) => new Date(p.timestamp));
  const equity = data.equityCurve.map((p: any) => p.equity);

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>SOL Backtest Equity Curve</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  </head>
  <body>
    <div id="chart" style="width:100%;height:600px;"></div>
    <script>
      const trace = {
        x: ${JSON.stringify(timestamps)},
        y: ${JSON.stringify(equity)},
        mode: 'lines+markers',
        name: 'Equity Curve',
        line: {color: 'green'}
      };
      const layout = {
        title: 'SOL Backtest Equity Curve',
        xaxis: {title: 'Time'},
        yaxis: {title: 'Equity ($)'}
      };
      Plotly.newPlot('chart', [trace], layout);
    </script>
  </body>
  </html>
  `;

  const outFile = path.resolve(__dirname, '../../data/backtest_plot.html');
  await fs.writeFile(outFile, html);
  console.log(`✅ Plot saved to ${outFile}. Open it in a browser to see the equity curve.`);
}

main();
