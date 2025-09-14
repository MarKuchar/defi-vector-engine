import json
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime

# Load backtest results
with open('src/data/backtest_sol.json') as f:
    data = json.load(f)

equity_curve = data['equityCurve']
trades = data['trades']

# Prepare data
times = [datetime.fromtimestamp(pt['timestamp']/1000) for pt in equity_curve]
equity = [pt['equity'] for pt in equity_curve]

plt.figure(figsize=(14,7))
plt.plot(times, equity, label='Equity Curve', color='blue')

# Mark trades
for trade in trades:
    t = datetime.fromtimestamp(trade['timestamp']/1000)
    if trade['direction'] == 'LONG':
        plt.scatter(t, trade['price'], color='green', marker='^', s=100, label='LONG')
    elif trade['direction'] == 'CLOSE':
        plt.scatter(t, trade['price'], color='red', marker='v', s=100, label='CLOSE')

plt.title('SOL Backtest Equity Curve & Trades')
plt.xlabel('Time')
plt.ylabel('Equity / Price')
plt.grid(True)
plt.legend()
plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d %H:%M'))
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()
