import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';

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
        console.log("Requesting weather for:", lat, lon); // Debug
        
        // Fetch weather data from Open-Meteo
        const weatherResponse = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code&past_days=1&forecast_days=3&timezone=auto`
        );
        const weatherData = weatherResponse.data;
        console.log("Weather data received:", weatherData);
        
        // Render weather display
        res.render("index.ejs", { weatherData });
    } catch (error) {
        console.error("Error fetching weather:", error.message);
        console.error("Full error:", error);
        res.render("index.ejs", { weatherData: null, error: "Could not fetch weather data" });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});