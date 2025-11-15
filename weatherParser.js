// weatherParser.js

/**
 * Parse Open-Meteo hourly data into structured forecast objects
 */
function parseHourlyData(weatherData) {
    const hourly = weatherData.hourly;
    
    return hourly.time.map((time, index) => {
        // Parse as UTC then adjust - the API says these ARE in America/Chicago already
        // So we treat them as if they're already the correct local time
        const [date, timeStr] = time.split('T');
        const [year, month, day] = date.split('-');
        const [hour, minute] = timeStr.split(':');
        
        // Create date using local timezone constructor (this interprets as browser's local time)
        const localDate = new Date(year, month - 1, day, hour, minute || 0);
        
        return {
            time: localDate,
            temperature: hourly.temperature_2m[index],
            feelsLike: hourly.apparent_temperature[index],
            precipChance: hourly.precipitation_probability[index],
            weatherCode: hourly.weather_code[index]
        };
    });
}

/**
 * Get the current hour's forecast (or closest available)
 */
function getCurrentHourForecast(parsedData) {
    const now = new Date();
    // Find the forecast closest to current time
    return parsedData.reduce((closest, forecast) => {
        const currentDiff = Math.abs(now - forecast.time);
        const closestDiff = Math.abs(now - closest.time);
        return currentDiff < closestDiff ? forecast : closest;
    });
}

/**
 * Get a range of hours around the current time
 * @param {Array} parsedData - Array of parsed hourly forecasts
 * @param {number} hoursBefore - How many hours before current to include
 * @param {number} hoursAfter - How many hours after current to include
 */
function getHourlyRange(parsedData, hoursBefore = 3, hoursAfter = 6) {
    const now = new Date();
    console.log("Browser's current time:", now.toString());
    console.log("Browser's current hour:", now.getHours());
    console.log("First few forecast times:", parsedData.slice(0, 5).map(f => ({
        time: f.time.toString(),
        hour: f.time.getHours()
    })));
    const currentIndex = parsedData.findIndex(forecast => 
        Math.abs(now - forecast.time) < 30 * 60 * 1000 // within 30 minutes; 60,000 ms = 1 min
    );
    console.log("Current index found:", currentIndex);
    console.log("Selected current forecast:", parsedData[currentIndex]);
    
    if (currentIndex === -1) return parsedData.slice(0, hoursBefore + hoursAfter + 1);
    
    const startIndex = Math.max(0, currentIndex - hoursBefore);
    const endIndex = Math.min(parsedData.length, currentIndex + hoursAfter + 1);
    
    return parsedData.slice(startIndex, endIndex).map((forecast, index) => ({
        ...forecast,
        isCurrent: index === (currentIndex - startIndex)
    }));
}

/**
 * Get today's high and low temperatures
 */
function getTodayHighLow(parsedData) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayData = parsedData.filter(forecast => 
        forecast.time >= today && forecast.time < tomorrow
    );
    
    if (todayData.length === 0) return { high: null, low: null };
    
    return {
        high: Math.max(...todayData.map(f => f.temperature)),
        low: Math.min(...todayData.map(f => f.temperature))
    };
}

/**
 * Convert WMO weather code to description
 */
function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };
    
    return descriptions[code] || 'Unknown';
}

/**
 * Determine if a given time is during daytime
 * @param {Date} time - The time to check
 * @param {Object} dailyData - The daily data from Open-Meteo (contains sunrise/sunset)
 */
function isDaytime(time, dailyData) {
    if (!dailyData || !dailyData.sunrise || !dailyData.sunset) {
        // Fallback: assume daytime is 6 AM to 8 PM
        const hour = time.getHours();
        return hour >= 6 && hour < 20;
    }
    
    // Find the sunrise/sunset for this date
    const dateString = time.toISOString().split('T')[0]; // Get YYYY-MM-DD
    const dayIndex = dailyData.time.findIndex(d => d === dateString);
    
    if (dayIndex === -1) {
        // Can't find the day, use fallback
        const hour = time.getHours();
        return hour >= 6 && hour < 20;
    }
    
    const sunrise = new Date(dailyData.sunrise[dayIndex]);
    const sunset = new Date(dailyData.sunset[dayIndex]);
    
    return time >= sunrise && time < sunset;
}

/**
 * Get the appropriate weather icon class
 * @param {number} code - WMO weather code
 * @param {boolean} isDay - Whether it's daytime
 */
function getWeatherIcon(code, isDay) {
    // Base class for all weather icons
    const prefix = 'wi wi-';
    
    // Map WMO codes to icon names
    const iconMap = {
        0: isDay ? 'day-sunny' : 'night-clear',           // Clear sky
        1: isDay ? 'day-sunny-overcast' : 'night-alt-partly-cloudy',  // Mainly clear
        2: isDay ? 'day-cloudy' : 'night-alt-cloudy',     // Partly cloudy
        3: 'cloudy',                                       // Overcast (same day/night)
        45: 'fog',                                         // Fog
        48: 'fog',                                         // Depositing rime fog
        51: 'sprinkle',                                    // Light drizzle
        53: 'sprinkle',                                    // Moderate drizzle
        55: 'rain',                                        // Dense drizzle
        61: 'rain',                                        // Slight rain
        63: 'rain',                                        // Moderate rain
        65: 'rain',                                        // Heavy rain
        71: 'snow',                                        // Slight snow
        73: 'snow',                                        // Moderate snow
        75: 'snow',                                        // Heavy snow
        80: 'showers',                                     // Slight rain showers
        81: 'showers',                                     // Moderate rain showers
        82: 'rain',                                        // Violent rain showers
        95: 'thunderstorm',                                // Thunderstorm
        96: 'storm-showers',                               // Thunderstorm with slight hail
        99: 'storm-showers'                                // Thunderstorm with heavy hail
    };
    
    const iconName = iconMap[code] || (isDay ? 'day-sunny' : 'night-clear');
    return prefix + iconName;
}

/**
 * Get today's sunrise and sunset times
 * @param {Object} dailyData - The daily data from Open-Meteo
 */
function getTodaySunTimes(dailyData) {
    if (!dailyData || !dailyData.sunrise || !dailyData.sunset) {
        return { sunrise: null, sunset: null };
    }
    
    // Get today's date string (YYYY-MM-DD)
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    // Find today in the daily data
    const dayIndex = dailyData.time.findIndex(d => d === dateString);
    
    if (dayIndex === -1) {
        return { sunrise: null, sunset: null };
    }
    
    // Return Date objects for sunrise and sunset
    return {
        sunrise: new Date(dailyData.sunrise[dayIndex]),
        sunset: new Date(dailyData.sunset[dayIndex])
    };
}
// UPDATED EXPORT - includes the two new functions
export {
    parseHourlyData,
    getCurrentHourForecast,
    getHourlyRange,
    getTodayHighLow,
    getWeatherDescription,
    isDaytime,
    getWeatherIcon,
    getTodaySunTimes
};