import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import 'dotenv/config'; // Load environment variables from .env file
import { // Import parsing functions from weatherParser.js
    parseHourlyData, 
    getCurrentHourForecast,
    getHourlyRange,
    getTodayHighLow,
    getWeatherDescription,
    isDaytime,
    getWeatherIcon,
    getTodaySunTimes
} from './weatherParser.js';

const app = express();
const PORT = process.env.PORT || 3456;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render("index.ejs", { weatherData: null });
});

app.get("/weather", async (req, res) => {
    try {
        const { lat, lon, tz, offset } = req.query; // Get latitude and longitude from query parameters req.query.lat, req.query.lon
        const timezone = tz || 'auto'; // Get timezone from query parameters or default to 'auto'
        const userOffsetMinutes = parseInt(offset) || 0; // User's timezone offset in minutes
        console.log("Requesting weather for:", lat, lon);
        
        // Fetch weather data from WeatherAPI
        const weatherResponse = await axios.get(
            `https://api.weatherapi.com/v1/forecast.json?key=${process.env.WEATHERAPI_KEY}&q=${lat},${lon}&days=3&aqi=no&alerts=no`
        );
        console.log("WeatherAPI response keys:", Object.keys(weatherResponse.data));
        console.log("Forecast days count:", weatherResponse.data.forecast?.forecastday?.length);
        console.log("First hour sample:", weatherResponse.data.forecast?.forecastday?.[0]?.hour?.[0]);
        let quote = null;
        try {
            const quoteResponse = await axios.get('https://zenquotes.io/api/random');
            quote = quoteResponse.data[0]; // Returns an array, get first item
        } catch (quoteError) {
            console.error("Error fetching quote:", quoteError.message);
            quote = null;
        }

        const rawData = weatherResponse.data; // Get raw data from response
        
        // Parse the data into a more usable format
        const parsedHourly = parseHourlyData(rawData); 
        const currentForecast = getCurrentHourForecast(parsedHourly);
        const hourlyRange = getHourlyRange(parsedHourly, 12, 18, userOffsetMinutes); // hours before, hours after
        const { high, low } = getTodayHighLow(parsedHourly);
        const { sunrise, sunset } = getTodaySunTimes(rawData.forecast);

        // Add icon classes and descriptions to each hour
        const hourlyWithIcons = hourlyRange.map(hour => ({
            ...hour,
            iconClass: getWeatherIcon(hour.weatherCode, isDaytime(hour.time, null, hour.isDay)),
            description: getWeatherDescription(hour.weatherCode)
}));
        
        // Package everything
        const weatherData = {
            current: {
                ...currentForecast,
                description: getWeatherDescription(currentForecast.weatherCode),
                iconClass: getWeatherIcon(currentForecast.weatherCode, isDaytime(currentForecast.time, null, currentForecast.isDay))
            },
            hourlyRange: hourlyWithIcons,
            todayHigh: high,
            todayLow: low,
            sunrise: sunrise,
            sunset: sunset,
            quote: quote ? {
                text: quote.q,
                author: quote.a
            } : null
        };

        res.render("index.ejs", { weatherData });
    } catch (error) {
        console.error("Error fetching weather:", error.message);
        const message = error.response?.status === 429
            ? "Weather API rate limit hit — try again in a moment."
            : "Could not fetch weather data";
        res.render("index.ejs", { weatherData: null, error: message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});