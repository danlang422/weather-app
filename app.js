import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
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
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render("index.ejs", { weatherData: null });
});

app.get("/weather", async (req, res) => {
    try {
        const { lat, lon, tz } = req.query; // Get latitude and longitude from query parameters req.query.lat, req.query.lon
        const timezone = tz || 'auto'; // Get timezone from query parameters or default to 'auto'
        console.log("Requesting weather for:", lat, lon);
        
        // Fetch weather data from Open-Meteo
        const weatherResponse = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code&daily=sunrise,sunset&past_days=1&forecast_days=3&timezone=${timezone}&temperature_unit=fahrenheit`
        );
        const quoteResponse = await axios.get('https://zenquotes.io/api/random');
        const quote = quoteResponse.data[0]; // Returns an array, get first item

        const rawData = weatherResponse.data; // Get raw data from response
        console.log("First few time strings from API:", rawData.hourly.time.slice(0, 5));
        console.log("Timezone from API:", rawData.timezone);
        
        // Parse the data into a more usable format
        const parsedHourly = parseHourlyData(rawData); 
        const currentForecast = getCurrentHourForecast(parsedHourly);
        const hourlyRange = getHourlyRange(parsedHourly, 12, 18); // hours before, hours after
        const { high, low } = getTodayHighLow(parsedHourly);
        const { sunrise, sunset } = getTodaySunTimes(rawData.daily);

        // Add icon classes and descriptions to each hour
        const hourlyWithIcons = hourlyRange.map(hour => ({
            ...hour,
            iconClass: getWeatherIcon(hour.weatherCode, isDaytime(hour.time, rawData.daily)),
            description: getWeatherDescription(hour.weatherCode)
}));
        
        // Package everything
        const weatherData = {
            current: {
                ...currentForecast,
                description: getWeatherDescription(currentForecast.weatherCode),
                iconClass: getWeatherIcon(currentForecast.weatherCode, isDaytime(currentForecast.time, rawData.daily))
            },
            hourlyRange: hourlyWithIcons,
            todayHigh: high,
            todayLow: low,
            sunrise: sunrise,
            sunset: sunset,
            timezone: rawData.timezone,
            units: rawData.hourly_units,
            quote: {
                text: quote.q,
                author: quote.a
            }
        };
        
        res.render("index.ejs", { weatherData });
    } catch (error) {
        console.error("Error fetching weather:", error.message);
        res.render("index.ejs", { weatherData: null, error: "Could not fetch weather data" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});