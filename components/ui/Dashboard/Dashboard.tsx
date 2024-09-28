'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import Select from 'react-select';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

export default function DashboardPage({ user, userName, subscription }: any) {
  const [selectedTicker, setSelectedTicker] = useState<string>('SPY');
  const [todayChartData, setTodayChartData] = useState<any>(null);
  const [previousTradingDayData, setPreviousTradingDayData] = useState<any>(null); // New state for previous trading day's data
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<string>(''); 
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(false);
  const [isMarketClose, setIsMarketClose] = useState<boolean>(false);
  const newYorkTimeZone = 'America/New_York';

  useEffect(() => {
    const checkTradingDayAndFetchData = () => {
      const today = new Date();
      const dayOfWeek = today.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend: 0 = Sunday, 6 = Saturday
        console.log('Today is a weekend, fetching previous trading day data.');
        const lastTradingDay = getPreviousTradingDay();
        fetchGoogleSheetData(lastTradingDay); // Fetch data for the previous trading day
        calculateCountdown(getNextMonday());
      } else {
        fetchGoogleSheetData(today); // Fetch data for today if it's a trading day
      }
    };

    checkMarketStatus();
    checkTradingDayAndFetchData();
  }, [selectedTicker]);

  // Function to fetch data from Google Sheets for a specific day
  const fetchGoogleSheetData = async (date: Date) => {
    try {
      const historicalSpreadsheetId = process.env.NEXT_PUBLIC_HIST_SHEET; 
      const predictedSpreadsheetId = process.env.NEXT_PUBLIC_PRED_SHEET;

      const apiKey = process.env.NEXT_PUBLIC_GOOGLESHEET_API_KEY;

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

      const { todayData, previousDayData } = stitchData(historicalData.values, predictedData.values, date);
      setTodayChartData(todayData);
      setPreviousTradingDayData(previousDayData); // Update previous trading day data state
    } catch (error: any) {
      console.error('Error occurred:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get the previous trading day
  const getPreviousTradingDay = () => {
    let today = new Date();
    let dayOfWeek = today.getDay();

    // If it's a weekend, move to Friday
    if (dayOfWeek === 0) { // Sunday
      today.setDate(today.getDate() - 2); // Move to Friday
    } else if (dayOfWeek === 6) { // Saturday
      today.setDate(today.getDate() - 1); // Move to Friday
    }
    
    // Further logic for holidays could be added here if required
    return today;
  };

  // Get the next Monday date if today is a weekend
  const getNextMonday = () => {
    const today = utcToZonedTime(new Date(), newYorkTimeZone);
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // Calculate days to Monday
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 30, 0, 0); // Set next Monday to 9:30 AM Eastern Time
    return nextMonday;
  };

  const calculateCountdown = (targetTime: Date) => {
    const now = utcToZonedTime(new Date(), newYorkTimeZone);
    const timeDifference = targetTime.getTime() - now.getTime();
    const days = Math.floor((timeDifference / (1000 * 60 * 60 * 24)));
    const hours = Math.floor((timeDifference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeDifference / (1000 * 60)) % 60);
    const seconds = Math.floor((timeDifference / 1000) % 60);

    setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    setTimeout(() => calculateCountdown(targetTime), 1000);
  };

  const checkMarketStatus = () => {
    const now = new Date();

    const marketOpen = getNextMarketOpen();
    const marketClose = utcToZonedTime(new Date(), newYorkTimeZone);
    marketClose.setHours(16, 0, 0, 0); // 4:00 PM Eastern Time

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

  const getNextMarketOpen = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    if (dayOfWeek === 6 || dayOfWeek === 0) { // Saturday or Sunday
      const nextMonday = new Date(today);
      const daysUntilMonday = dayOfWeek === 6 ? 2 : 1; // From Saturday, 2 days, from Sunday, 1 day
      nextMonday.setDate(today.getDate() + daysUntilMonday);
      nextMonday.setHours(9, 30, 0, 0); // 9:30 AM Eastern Time
      return utcToZonedTime(nextMonday, newYorkTimeZone);
    }

    const marketOpenToday = new Date(today);
    marketOpenToday.setHours(9, 30, 0, 0); // 9:30 AM Eastern Time
    return today.getTime() < marketOpenToday.getTime()
      ? utcToZonedTime(marketOpenToday, newYorkTimeZone)
      : getNextTradingDay();
  };

  const getNextTradingDay = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Move to the next trading day
    if (dayOfWeek === 5) { // Friday, move to next Monday
      today.setDate(today.getDate() + 3);
    } else {
      today.setDate(today.getDate() + 1); // Any other weekday, move to next day
    }
    today.setHours(9, 30, 0, 0); // Set the next trading day to 9:30 AM Eastern Time
    return utcToZonedTime(today, newYorkTimeZone);
  };

  // Updated function to handle stitching of today's and previous trading day's data
  const stitchData = (historicalData: any[], predictedData: any[], date: Date) => {
    const todayData: any[] = [];
    const previousDayData: any[] = [];
    const predictedValues = predictedData.slice(1); // Skip header
  
    const today = new Date();
    const targetDay = new Date(date);
  
    for (let i = 0; i < historicalData.length; i++) {
      const [timestamp, price] = historicalData[i];
  
      let dateInET;
  
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
  
      const hour = dateInET.getHours();
      const minutes = dateInET.getMinutes();
      if (hour < 8 || (hour === 8 && minutes < 30) || hour >= 16) { // - 1 hour for prediction algo
        continue;
      }
  
      const currentPrice = parseFloat(price);
      if (isNaN(currentPrice)) {
        continue;
      }
  
      const futureHourIndex = i + 12;
      const futurePrice = futureHourIndex < historicalData.length
        ? parseFloat(historicalData[futureHourIndex][1])
        : NaN;
  
      if (predictedValues[Math.floor(i / 12)]) {
        const [_, predictedHigh, predictedLow] = predictedValues[Math.floor(i / 12)];
        let currentDateInET = utcToZonedTime(new Date(historicalData[i][0]), newYorkTimeZone);
        let predictionTime = new Date(currentDateInET.getTime() + 60 * 60 * 1000);
  
        const formattedPredictionTime = format(predictionTime, 'yyyy-MM-dd HH:mm:ss', {});
  
        const stitchedRow = {
          timestamp: formattedPredictionTime,
          price: futurePrice,
          predictedHigh: parseFloat(predictedHigh) * currentPrice,
          predictedLow: parseFloat(predictedLow) * currentPrice,
        };
  
        // Compare the date in Eastern Time with the targetDay to determine which dataset to update
        if (dateInET.getDate() === today.getDate()) {
          todayData.push(stitchedRow);
        } else if (dateInET.getDate() === targetDay.getDate()) {
          previousDayData.push(stitchedRow);
        }
      }
    }
  
    return { todayData, previousDayData };
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

  const hobbyistTickerOptions = [
    { value: 'SPY', label: 'SPY' },
    { value: 'MAGS', label: 'MAGS' },
    { value: 'AAPL', label: 'AAPL' },
    { value: 'GOOG', label: 'GOOG' },

  ];
  
  
  const professionalTickerOptions = [
    { value: 'SPY', label: 'SPY' },
    { value: 'MAGS', label: 'MAGS' },
    { value: 'AAPL', label: 'AAPL' },
    { value: 'AMZN', label: 'AMZN' },
    { value: 'GOOG', label: 'GOOG' },
    { value: 'NVDA', label: 'NVDA' },
    { value: 'RIVN', label: 'RIVN' },
  ];

  const tickerOptions = subscription?.prices?.products?.name === 'Professional'
  ? professionalTickerOptions
  : hobbyistTickerOptions;


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
                <div className="w-full max-w-4xl p-4 bg-black rounded shadow">
                  <h2 className="text-center text-white text-2xl mb-4">Today's Trading Data ({selectedTicker})</h2>
                  {todayChartData ? (
                    <Line
                      data={{
                        labels: todayChartData.map((row: any) => new Date(row.timestamp)),
                        datasets: [
                          {
                            label: 'Price (Actual)',
                            data: todayChartData.map((row: any) => row.price),
                            borderColor: 'rgba(255, 255, 255, 1)',
                            backgroundColor: 'rgba(0, 123, 255, 0.4)', 
                          },
                          {
                            label: 'High (Predicted)',
                            data: todayChartData.map((row: any) => row.predictedHigh),
                            borderColor: 'rgba(0, 255, 200, 1)', 
                            backgroundColor: 'rgba(0, 255, 150, 0.3)', 
                          },
                          {
                            label: 'Low (Predicted)',
                            data: todayChartData.map((row: any) => row.predictedLow),
                            borderColor: 'rgba(255, 99, 132, 1)',  
                            backgroundColor: 'rgba(255, 99, 132, 0.3)', 
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

            <div className="w-full max-w-4xl p-4 bg-black rounded shadow">
              <h2 className="text-center text-white text-2xl mb-4">Previous Trading Day's Data ({selectedTicker})</h2>
              {previousTradingDayData ? (
                <Line
                  data={{
                    labels: previousTradingDayData.map((row: any) => new Date(row.timestamp)),
                    datasets: [
                      {
                        label: 'Price (Actual)',
                        data: previousTradingDayData.map((row: any) => row.price),
                        borderColor: 'rgba(255, 255, 255, 1)', 
                        backgroundColor: 'rgba(0, 123, 255, 0.4)', 
                      },
                      {
                        label: 'High (Predicted)',
                        data: previousTradingDayData.map((row: any) => row.predictedHigh),
                        borderColor: 'rgba(0, 255, 200, 1)', 
                        backgroundColor: 'rgba(0, 255, 150, 0.3)', 
                      },
                      {
                        label: 'Low (Predicted)',
                        data: previousTradingDayData.map((row: any) => row.predictedLow),
                        borderColor: 'rgba(255, 99, 132, 1)',  
                        backgroundColor: 'rgba(255, 99, 132, 0.3)', 
                      },
                    ],
                  }}
                  options={options}
                />
              ) : (
                <div className="text-white text-center">No data available for the previous trading day.</div>
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
