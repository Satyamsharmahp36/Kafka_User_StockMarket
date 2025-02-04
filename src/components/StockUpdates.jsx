import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StockUpdates = () => {
  const [stockData, setStockData] = useState([]);
  const [aggregatedData, setAggregatedData] = useState([]);
  const [chartWidth, setChartWidth] = useState(600);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const POINTS_PER_AGGREGATE = 100;

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/ws/delivery");
    
    ws.onmessage = (event) => {
      const priceMatch = event.data.match(/Stock Update: ([\d.]+)/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1]);
        
        setStockData(prevData => {
          const newData = [...prevData, {
            time: prevData.length + 1,
            price: price
          }];
          
          const aggregates = [];
          for (let i = 0; i < newData.length; i += POINTS_PER_AGGREGATE) {
            const chunk = newData.slice(i, i + POINTS_PER_AGGREGATE);
            const avgPrice = chunk.reduce((sum, item) => sum + item.price, 0) / chunk.length;
            const minPrice = Math.min(...chunk.map(item => item.price));
            const maxPrice = Math.max(...chunk.map(item => item.price));
            
            aggregates.push({
              groupIndex: Math.floor(i / POINTS_PER_AGGREGATE) + 1,
              startTime: chunk[0].time,
              endTime: chunk[chunk.length - 1].time,
              avgPrice: avgPrice,
              minPrice: minPrice,
              maxPrice: maxPrice,
              numPoints: chunk.length
            });
          }
          
          setAggregatedData(aggregates);
          setChartWidth(Math.max(600, aggregates.length * 60));
          
          return newData;
        });
      }
    };

    ws.onerror = (error) => console.error('WebSocket error:', error);
    ws.onclose = () => console.log('WebSocket connection closed');
    return () => ws.close();
  }, []);

  const getLatestMetrics = () => {
    if (aggregatedData.length === 0) return null;
    const latest = aggregatedData[aggregatedData.length - 1];
    const previous = aggregatedData[aggregatedData.length - 2];
    const priceChange = previous ? ((latest.avgPrice - previous.avgPrice) / previous.avgPrice) * 100 : 0;
    return {
      currentPrice: latest.avgPrice,
      priceChange,
      lowPrice: latest.minPrice,
      highPrice: latest.maxPrice
    };
  };

  const metrics = getLatestMetrics();

  const TimeframeButton = ({ value, label }) => (
    <button
      onClick={() => setSelectedTimeframe(value)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
        ${selectedTimeframe === value 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen text-black bg-blue-100 rounded-4xl shadow-2xl  p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Market Overview</h1>
            <p className="text-gray-500 mt-1">Live stock price updates</p>
          </div>
          <div className="flex items-center space-x-2 bg-green-100 text-green-600 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live</span>
          </div>
        </div>

        <div className="h-64 mb-14 overflow-x-auto">
          {aggregatedData.length > 0 ? (
            <div style={{ width: `${chartWidth}px`, minWidth: '100%', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregatedData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="groupIndex" 
                    label={{ value: 'Group Number', position: 'bottom' }}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    label={{ value: 'Price ($)', angle: -90, position: 'left' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-bold">Group #{data.groupIndex}</p>
                            <p>Updates: {data.startTime} - {data.endTime}</p>
                            <p>Average: ${data.avgPrice.toFixed(2)}</p>
                            <p>Range: ${data.minPrice.toFixed(2)} - ${data.maxPrice.toFixed(2)}</p>
                            <p>Points: {data.numPoints}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgPrice" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    animationDuration={300}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Waiting for data...
            </div>
          )}
        </div>

       
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="text-sm text-gray-500">Current Price</div>
              <div className="text-2xl font-bold mt-1">${metrics.currentPrice.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="text-sm text-gray-500">Price Change</div>
              <div className={`text-2xl font-bold mt-1 flex items-center
                ${metrics.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {metrics.priceChange >= 0 ? '↑' : '↓'}
                {Math.abs(metrics.priceChange).toFixed(2)}%
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="text-sm text-gray-500">24h Low</div>
              <div className="text-2xl font-bold mt-1">${metrics.lowPrice.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="text-sm text-gray-500">24h High</div>
              <div className="text-2xl font-bold mt-1">${metrics.highPrice.toFixed(2)}</div>
            </div>
          </div>
        )}

       
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">

          
          <div className="h-[400px]">
            {aggregatedData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregatedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="groupIndex" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 border rounded-lg shadow-lg">
                            <div className="font-semibold mb-2">Group #{data.groupIndex}</div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Average:</span>
                                <span className="font-medium">${data.avgPrice.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Range:</span>
                                <span className="font-medium">
                                  ${data.minPrice.toFixed(2)} - ${data.maxPrice.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Updates:</span>
                                <span className="font-medium">{data.numPoints}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgPrice" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    fill="url(#colorPrice)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-gray-500 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                  Waiting for market data...
                </div>
              </div>
            )}
          </div>
        </div>

        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Updates</h2>
          <div className="overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              {aggregatedData.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Range</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price Range</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {aggregatedData.slice().reverse().map((group) => (
                      <tr key={group.groupIndex} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{group.groupIndex}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {group.startTime} - {group.endTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${group.avgPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${group.minPrice.toFixed(2)} - ${group.maxPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">No updates available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockUpdates;
      