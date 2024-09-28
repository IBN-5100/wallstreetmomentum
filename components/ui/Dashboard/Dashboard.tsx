'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
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
import 'chartjs-adapter-date-fns'; // Import necessary date adapter for time scales
import { parseISO, isValid, parse } from 'date-fns'; // Import necessary functions from date-fns
import { utcToZonedTime, format } from 'date-fns-tz'; // Correct import from date-fns-tz
import LogoCloud from '@/components/ui/LogoCloud';
import { TailSpin } from 'react-loader-spinner'; // Import the spinner

// Register necessary chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

export default function DashboardPage({ user, userName, subscription }: any) {
  const [todayChartData, setTodayChartData] = useState<any>(null);
  const [yesterdayChartData, setYesterdayChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);  // Loading state
  const [countdown, setCountdown] = useState<string>(''); // Countdown timer state
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(true); // Market open state
  const [isMarketClose, setIsMarketClose] = useState<boolean>(false); // Market close state
  const pacificTimeZone = 'America/Los_Angeles'; // Pacific Time

  useEffect(() => {
    const fetchGoogleSheetData = async () => {
      try {
        const historicalSpreadsheetId = '1ynlVDLQBTRUDZHdUIFppuZH_qlAeG1Ho82X8-8i8Uzw'; // Historical data
        const predictedSpreadsheetId = '1nZ7nA3S7YZ8jmmM2WhEaKiqrdAFGwGmXVEiorHCLXac'; // Predicted data

        const apiKey = process.env.NEXT_PUBLIC_GOOGLESHEET_API_KEY;

        if (!apiKey) {
          throw new Error('Google Sheets API key is missing in environment variables');
        }

        // Fetch historical price data
        const historicalRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${historicalSpreadsheetId}/values/spy!A:G?key=${apiKey}`
        );
        if (!historicalRes.ok) {
          throw new Error(`Failed to fetch historical data: ${historicalRes.statusText}`);
        }
        const historicalData = await historicalRes.json();

        // Fetch predicted data
        const predictedRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${predictedSpreadsheetId}/values/spy!A:D?key=${apiKey}`
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
        setLoading(false);  // Stop loading after fetching
      }
    };

    checkMarketStatus();
    fetchGoogleSheetData(); // Fetch data after checking market status
  }, []);

  // Function to calculate the countdown to market open/close
  const calculateCountdown = (targetTime: Date) => {
    const now = new Date();
    const timeDifference = targetTime.getTime() - now.getTime();
    const hours = Math.floor((timeDifference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeDifference / (1000 * 60)) % 60);
    const seconds = Math.floor((timeDifference / 1000) % 60);

    setCountdown(`${hours}h ${minutes}m ${seconds}s`);

    // Keep updating the countdown every second
    setTimeout(() => calculateCountdown(targetTime), 1000);
  };

  // Function to check if the market is open
  const checkMarketStatus = () => {
    const now = new Date();
    const marketOpen = new Date();
    const marketClose = new Date();

    marketOpen.setHours(9, 30, 0, 0); // 9:30 AM Pacific Time
    marketClose.setHours(16, 0, 0, 0); // 4:00 PM Pacific Time

    if (now >= marketOpen && now <= marketClose) {
      setIsMarketOpen(true); // Market is open
      setIsMarketClose(false); // Countdown for market close
      calculateCountdown(marketClose);
    } else if (now < marketOpen) {
      setIsMarketOpen(false); // Market is not open yet
      setIsMarketClose(false);
      calculateCountdown(marketOpen); // Start countdown to market open
    } else {
      setIsMarketOpen(false); // Market is closed
      setIsMarketClose(true); // After close, show closed message
    }
  };

  // Function to match and stitch the hourly data to the 5-minute intervals for today and yesterday
  const stitchData = (historicalData: any[], predictedData: any[]) => {
    const todayData: any[] = [];
    const yesterdayData: any[] = [];
    const predictedValues = predictedData.slice(1); // Skip header

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    for (let i = 0; i < historicalData.length; i++) {
      const [timestamp, price] = historicalData[i];

      let dateInPT;

      // First, check if the timestamp is in ISO format
      if (isValid(parseISO(timestamp))) {
        dateInPT = utcToZonedTime(new Date(timestamp), pacificTimeZone); // Convert ISO date to PT
      } else {
        // Attempt to parse 'yyyy-MM-dd HH:mm:ss' format
        dateInPT = parse(timestamp, 'yyyy-MM-dd HH:mm:ss', new Date());
        if (isValid(dateInPT)) {
          dateInPT = utcToZonedTime(dateInPT, pacificTimeZone);
        } else {
          // Attempt to parse 'MM/dd/yyyy HH:mm:ss' format
          dateInPT = parse(timestamp, 'MM/dd/yyyy HH:mm:ss', new Date());
          if (isValid(dateInPT)) {
            dateInPT = utcToZonedTime(dateInPT, pacificTimeZone);
          } else {
            console.warn('Invalid timestamp format:', timestamp);
            continue; // Skip this iteration if the timestamp is invalid
          }
        }
      }

      // Use the correct format from 'date-fns-tz' which handles time zones
      const formattedTime = format(dateInPT, 'yyyy-MM-dd HH:mm:ss', {});

      // Only include data within trading hours (9:30 AM to 4:00 PM Pacific Time)
      const hour = dateInPT.getHours();
      const minutes = dateInPT.getMinutes();
      if (hour < 9 || (hour === 9 && minutes < 30) || hour >= 16) {
        continue; // Skip data outside trading hours
      }

      const hourIndex = Math.floor(i / 12); // 12 five-minute intervals in an hour
      if (!predictedValues[hourIndex]) continue;

      const [date, predictedHigh, predictedLow, predictedClose] = predictedValues[hourIndex];
      const stitchedRow = {
        timestamp: formattedTime,
        price: parseFloat(price),
        predictedHigh: parseFloat(predictedHigh) * price,
        predictedLow: parseFloat(predictedLow) * price,
        predictedClose: parseFloat(predictedClose) * price,
      };

      if (dateInPT.getDate() === today.getDate()) {
        todayData.push(stitchedRow);
      } else if (dateInPT.getDate() === yesterday.getDate()) {
        yesterdayData.push(stitchedRow);
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
        text: 'Wall Street Momentum Prediction for SPY',
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
          text: 'Time (Pacific Time)',
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

  return (
    <>
      {user && subscription ? (
        <section className="mb-32 bg-black">
          <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
            <div className="sm:align-center sm:flex sm:flex-col">
              <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
                Welcome Back, {userName}
              </h1>
              <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-2xl">
                Thanks for being a {subscription?.prices?.products?.name}!
              </p>
            </div>
          </div>
        </section>
      ) : user ? (
        <section className="mb-32 bg-black">
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
        <section className="mb-32 bg-black">
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

      <div className="flex flex-col justify-center items-center min-h-screen space-y-8"> {/* Stack the elements */}
        {loading ? (
          <TailSpin height="80" width="80" color="white" ariaLabel="loading" />
        ) : (
          <>
            {/* If market is closed, show countdown */}
            {!isMarketOpen && (
              <div className="text-white text-2xl">
                Market opens in: {countdown}
              </div>
            )}

            {/* Show today's chart if market is open */}
            {isMarketOpen && !isMarketClose && todayChartData && (
              <div className="w-full max-w-4xl p-4 bg-black rounded shadow">
                <h2 className="text-center text-white text-2xl mb-4">Today's Trading Data</h2>
                <Line
                  data={{
                    labels: todayChartData.map((row: any) => new Date(row.timestamp)),
                    datasets: [
                      {
                        label: 'Price',
                        data: todayChartData.map((row: any) => row.price),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                      },
                      {
                        label: 'Predicted High',
                        data: todayChartData.map((row: any) => row.predictedHigh),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                      },
                      {
                        label: 'Predicted Low',
                        data: todayChartData.map((row: any) => row.predictedLow),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                      },
                    ],
                  }}
                  options={options}
                />
              </div>
            )}

            {/* Yesterday's Data should always be shown */}
            <div className="w-full max-w-4xl p-4 bg-black rounded shadow">
              <h2 className="text-center text-white text-2xl mb-4">Yesterday's Trading Data</h2>
              {yesterdayChartData ? (
                <Line
                  data={{
                    labels: yesterdayChartData.map((row: any) => new Date(row.timestamp)),
                    datasets: [
                      {
                        label: 'Price',
                        data: yesterdayChartData.map((row: any) => row.price),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                      },
                      {
                        label: 'Predicted High',
                        data: yesterdayChartData.map((row: any) => row.predictedHigh),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                      },
                      {
                        label: 'Predicted Low',
                        data: yesterdayChartData.map((row: any) => row.predictedLow),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                      },
                    ],
                  }}
                  options={options}
                />
              ) : (
                <div className="text-white">No data available for yesterday</div>
              )}
            </div>

            {/* If market has closed, show message */}
            {isMarketClose && (
              <div className="text-white text-2xl">
                Market is closed for the day
              </div>
            )}
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
