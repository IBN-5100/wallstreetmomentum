'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import Select from 'react-select'; // Import react-select
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { parseISO, isValid, parse } from 'date-fns';
import { utcToZonedTime, format, zonedTimeToUtc } from 'date-fns-tz';
import LogoCloud from '@/components/ui/LogoCloud';
import { TailSpin } from 'react-loader-spinner';

// Register necessary chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

export default function DashboardPage({ user, userName, subscription }: any) {
  const [selectedTicker, setSelectedTicker] = useState<string>('SPY');
  const [todayChartData, setTodayChartData] = useState<any>(null);
  const [yesterdayChartData, setYesterdayChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<string>(''); 
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(false);
  const [isMarketClose, setIsMarketClose] = useState<boolean>(false);
  const newYorkTimeZone = 'America/New_York';

  useEffect(() => {
    const fetchGoogleSheetData = async () => {
      try {
        const historicalSpreadsheetId = '1ynlVDLQBTRUDZHdUIFppuZH_qlAeG1Ho82X8-8i8Uzw'; 
        const predictedSpreadsheetId = '1nZ7nA3S7YZ8jmmM2WhEaKiqrdAFGwGmXVEiorHCLXac';

        const apiKey = process.env.NEXT_PUBLIC_GOOGLESHEET_API_KEY;

        if (!apiKey) {
          throw new Error('Google Sheets API key is missing in environment variables');
        }

        const historicalRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${historicalSpreadsheetId}/values/${selectedTicker}!A:G?key=${apiKey}`
        );
        if (!historicalRes.ok) {
          throw new Error(`Failed to fetch historical data: ${historicalRes.statusText}`);
        }
        const historicalData = await historicalRes.json();

        const predictedRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${predictedSpreadsheetId}/values/${selectedTicker}!A:D?key=${apiKey}`
        );
        if (!predictedRes.ok) {
          throw new Error(`Failed to fetch predicted data: ${predictedRes.statusText}`);
        }
        const predictedData = await predictedRes.json();

        const { todayData, yesterdayData } = stitchData(historicalData.values, predictedData.values);

        setTodayChartData(todayData);
        setYesterdayChartData(yesterdayData);
      } catch (error: any) {
        console.error('Error occurred:', error.message);
      } finally {
        setLoading(false);
      }
    };

    checkMarketStatus();
    fetchGoogleSheetData();
  }, [selectedTicker]);

  const calculateCountdown = (targetTime: Date) => {
    const now = new Date();
    const timeDifference = targetTime.getTime() - now.getTime();
    const hours = Math.floor((timeDifference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeDifference / (1000 * 60)) % 60);
    const seconds = Math.floor((timeDifference / 1000) % 60);

    setCountdown(`${hours}h ${minutes}m ${seconds}s`);

    setTimeout(() => calculateCountdown(targetTime), 1000);
  };

  const checkMarketStatus = () => {
    const now = new Date();

    const marketOpen = utcToZonedTime(new Date(), newYorkTimeZone);
    const marketClose = utcToZonedTime(new Date(), newYorkTimeZone);

    marketOpen.setHours(9, 30, 0, 0); 
    marketClose.setHours(16, 0, 0, 0); 

    const marketOpenUtc = zonedTimeToUtc(marketOpen, newYorkTimeZone);
    const marketCloseUtc = zonedTimeToUtc(marketClose, newYorkTimeZone);

    if (now >= marketOpenUtc && now <= marketCloseUtc) {
      setIsMarketOpen(true);
      setIsMarketClose(false);
      calculateCountdown(marketCloseUtc);
    } else if (now < marketOpenUtc) {
      setIsMarketOpen(false);
      setIsMarketClose(false);
      calculateCountdown(marketOpenUtc);
    } else {
      setIsMarketOpen(false);
      setIsMarketClose(true);
    }
  };

  const stitchData = (historicalData: any[], predictedData: any[]) => {
    const todayData: any[] = [];
    const yesterdayData: any[] = [];
    const predictedValues = predictedData.slice(1); // Skip header
  
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
  
    for (let i = 0; i < historicalData.length; i++) {
      const [timestamp, price] = historicalData[i];
  
      let dateInET;
  
      // Parse the timestamp and convert it to Eastern Time (New York)
      if (isValid(parseISO(timestamp))) {
        dateInET = utcToZonedTime(new Date(timestamp), newYorkTimeZone);
      } else {
        dateInET = parse(timestamp, 'yyyy-MM-dd HH:mm:ss', new Date());
        if (isValid(dateInET)) {
          dateInET = utcToZonedTime(dateInET, newYorkTimeZone);
        } else {
          dateInET = parse(timestamp, 'MM/dd/yyyy HH:mm:ss', new Date());
          if (isValid(dateInET)) {
            dateInET = utcToZonedTime(dateInET, newYorkTimeZone);
          } else {
            console.warn('Invalid timestamp format:', timestamp);
            continue;
          }
        }
      }
  
      // Only include data within trading hours (9:30 AM to 4:00 PM Eastern Time)
      const hour = dateInET.getHours();
      const minutes = dateInET.getMinutes();
      if (hour < 8 || (hour === 8 && minutes < 30) || hour >= 16) {
        continue; // Skip data outside trading hours
      }
  
      const currentPrice = parseFloat(price);
      if (isNaN(currentPrice)) {
        continue; // Skip invalid price data
      }
  
      // Get future price (i + 12 index)
      const futureHourIndex = i + 12; // Shift by 12 intervals (5-minute intervals = 1 hour)
      const futurePrice = futureHourIndex < historicalData.length
        ? parseFloat(historicalData[futureHourIndex][1])
        : NaN; // Check if future price exists
  
      // Get prediction values for the current hour
      if (predictedValues[Math.floor(i / 12)]) {
        const [_, predictedHigh, predictedLow] = predictedValues[Math.floor(i / 12)];
  
        // Get the time for the current hour, then add 1 hour for the predicted timestamp
        let currentDateInET = utcToZonedTime(new Date(historicalData[i][0]), newYorkTimeZone);
        let predictionTime = new Date(currentDateInET.getTime() + 60 * 60 * 1000); // Add 1 hour
  
        const formattedPredictionTime = format(predictionTime, 'yyyy-MM-dd HH:mm:ss', {});
  
        const stitchedRow = {
          timestamp: formattedPredictionTime, // Future timestamp (+1 hour)
          price: futurePrice, // Future price for prediction
          predictedHigh: parseFloat(predictedHigh) * currentPrice, // Apply prediction for high using future price
          predictedLow: parseFloat(predictedLow) * currentPrice,   // Apply prediction for low using future price
        };
  
        // Add to today's or yesterday's data
        if (dateInET.getDate() === today.getDate()) {
          todayData.push(stitchedRow);
        } else if (dateInET.getDate() === yesterday.getDate()) {
          yesterdayData.push(stitchedRow);
        }
      }
    }
  
    return { todayData, yesterdayData };
  };  
  
  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Wall Street Momentum Prediction for ${selectedTicker}`,
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'minute' as 'minute',
          displayFormats: {
            minute: 'HH:mm',
          },
        },
        title: {
          display: true,
          text: 'Time (Eastern Time)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Price',
        },
      },
    },
  };

  const tickerOptions = [
    { value: 'SPY', label: 'SPY' },
    { value: 'GOOG', label: 'GOOG' },
    { value: 'NVDA', label: 'NVDA' },
    { value: 'RIVN', label: 'RIVN' },
  ];

  return (
    <>
      {/* Section for user */}
      {user && subscription ? (
        <section className="mb-12 bg-black">
          <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
            <div className="sm:align-center sm:flex sm:flex-col">
              <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
                Welcome Back, {userName}
              </h1>
              <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-xl">
                You'll never miss another <span className="text-pink-600">Wall Street Moment</span> with our AI flagship model, 
                (CNN-LSTM with GPT) sentiment - momentum forecaster: <br></br> <span className="text-pink-600">Wall Street Momentum</span>
              </p>
              <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-2xl">
                Thanks for being a {subscription?.prices?.products?.name}!
              </p>
            </div>
          </div>
        </section>
      ) : user ? (
        <section className="mb-12 bg-black">
          <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
            <div className="sm:align-center sm:flex sm:flex-col">
              <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
                Welcome, {userName}
              </h1>
              <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-2xl">
                As a courtesy, we've provided a delayed demo with the essentials for the latest trading window.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-12 bg-black">
          <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
            <div className="sm:align-center sm:flex sm:flex-col">
              <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-5xl">
                Never Miss Another Wall Street Moment
              </h1>
              <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-xl">
                Experience the financial tool that empowers our partners to manage over <br></br>
                <span className="text-pink-600 sm:text-3xl">$1.3 million</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* React-Select Dropdown for ticker */}
      <div className="flex justify-center mb-8">
        <Select
          options={subscription ? tickerOptions : tickerOptions.slice(0, 1)}
          value={tickerOptions.find(option => option.value === selectedTicker)}
          onChange={(option) => setSelectedTicker(option?.value ?? 'SPY')}
          isDisabled={!subscription}
          className="w-64 text-black"
          theme={(theme) => ({
            ...theme,
            borderRadius: 4,
            colors: {
              ...theme.colors,
              primary25: '#2f4f4f',  // Dark hover background
              primary: '#ec4899',    // Magenta selected text
              neutral0: '#000000',   // Dark dropdown background
              neutral80: '#f0f0f0',  // Light dropdown text
              neutral20: '#ec4899',  // Border color for dropdown
              neutral30: '#f0f0f0',  // Hover and active state border color
            },
          })}
          styles={{
            option: (provided, state) => ({
              ...provided,
              color: state.isSelected ? '#000000' : '#ffffff', // black for selected, Pink-600 for unselected
            }),
          }}
        />
      </div>

      <div className="flex flex-col justify-top items-center min-h-screen space-y-8">
        {loading ? (
          <TailSpin height="80" width="80" color="white" ariaLabel="loading" />
        ) : (
          <>
            {isMarketOpen ? (
              <>
                {/* Plot today's trading data */}
                <div className="w-full max-w-4xl p-4 bg-black rounded shadow">
                  <h2 className="text-center text-white text-2xl mb-4">Today's Trading Data</h2>
                  {todayChartData ? (
                    <Line
                      data={{
                        labels: todayChartData.map((row: any) => new Date(row.timestamp)),
                        datasets: [
                          {
                            label: 'Price (Actual)',
                            data: todayChartData.map((row: any) => row.price), // No need for condition, NaN will be handled
                            borderColor: 'rgba(255, 255, 255, 1)',  // White for actual price
                            backgroundColor: 'rgba(0, 123, 255, 0.4)', // Blue shadow
                          },
                          {
                            label: 'High (Predicted)',
                            data: todayChartData.map((row: any) => row.predictedHigh), // Predicted high for next hour
                            borderColor: 'rgba(0, 255, 200, 1)',  // Cyan-Green for predicted high
                            backgroundColor: 'rgba(0, 255, 150, 0.3)', // Cyan-Green shadow
                          },
                          {
                            label: 'Low (Predicted)',
                            data: todayChartData.map((row: any) => row.predictedLow), // Predicted low for next hour
                            borderColor: 'rgba(255, 99, 132, 1)',  // Pink-Red for predicted low
                            backgroundColor: 'rgba(255, 99, 132, 0.3)', // Pink-Red shadow
                          },
                        ],
                      }}
                      options={options}
                    />
                  ) : (
                    <div className="text-white text-center">No data available for today.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-white text-2xl">
                {isMarketClose ? 'Market is closed.' : `Time until market open: ${countdown}`}
              </div>
            )}

            {/* Plot yesterday's trading data */}
            <div className="w-full max-w-4xl p-4 bg-black rounded shadow">
              <h2 className="text-center text-white text-2xl mb-4">Yesterday's Trading Data</h2>
              {yesterdayChartData ? (
                <Line
                  data={{
                    labels: yesterdayChartData.map((row: any) => new Date(row.timestamp)),
                    datasets: [
                      {
                        label: 'Price (Actual)',
                        data: yesterdayChartData.map((row: any) => row.price), // Use NaN for missing prices
                        borderColor: 'rgba(255, 255, 255, 1)', // White for actual price
                        backgroundColor: 'rgba(0, 123, 255, 0.4)', // Blue shadow
                      },
                      {
                        label: 'High (Predicted)',
                        data: yesterdayChartData.map((row: any) => row.predictedHigh), // Predicted high for next hour
                        borderColor: 'rgba(0, 255, 200, 1)', // Cyan-Green for predicted high
                        backgroundColor: 'rgba(0, 255, 150, 0.3)', // Cyan-Green shadow
                      },
                      {
                        label: 'Low (Predicted)',
                        data: yesterdayChartData.map((row: any) => row.predictedLow), // Predicted low for next hour
                        borderColor: 'rgba(255, 99, 132, 1)', // Pink-Red for predicted low
                        backgroundColor: 'rgba(255, 99, 132, 0.3)', // Pink-Red shadow
                      },
                    ],
                  }}
                  options={options}
                />
              ) : (
                <div className="text-white text-center">No data available for yesterday.</div>
              )}
            </div>

          </>
        )}
      </div>

      <LogoCloud />
      <div>
        <br></br>
        <br></br>
      </div>
    </>
  );
}
