import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import { 
    parseHourlyData, 
    getCurrentHourForecast,
    getHourlyRange,
    getTodayHighLow,
    getWeatherDescription,
    isDaytime,
    getWeatherIcon
} from './weatherParser.js';

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render("index.ejs", { weatherData: null });
});

app.get("/weather", async (req, res) => {
    try {
        const { lat, lon } = req.query;
        console.log("Requesting weather for:", lat, lon);
        
        // Fetch weather data from Open-Meteo
        const weatherResponse = await axios.get(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code&daily=sunrise,sunset&past_days=1&forecast_days=3&timezone=auto&temperature_unit=fahrenheit`
);
        
        const rawData = weatherResponse.data;
        // DEBUG: Check if we got daily data
        console.log("Daily data:", rawData.daily);
        
        // Parse the data into a more usable format
        const parsedHourly = parseHourlyData(rawData);
        const currentForecast = getCurrentHourForecast(parsedHourly);
        const hourlyRange = getHourlyRange(parsedHourly, 6, 7); // hours before, hours after
        const { high, low } = getTodayHighLow(parsedHourly);

        // Add icon classes to each hour
        const hourlyWithIcons = hourlyRange.map(hour => ({
            ...hour,
            iconClass: getWeatherIcon(hour.weatherCode, isDaytime(hour.time, rawData.daily))
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
            timezone: rawData.timezone,
            units: rawData.hourly_units
        };
        // DEBUG: Check if iconClass was added
        console.log("First hour with icon:", hourlyWithIcons[0]);
        console.log("Icon class generated:", hourlyWithIcons[0].iconClass);
        console.log("Processed weather data:", weatherData);
        
        res.render("index.ejs", { weatherData });
    } catch (error) {
        console.error("Error fetching weather:", error.message);
        res.render("index.ejs", { weatherData: null, error: "Could not fetch weather data" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});