// weatherParser.js

/**
 * Parse WeatherAPI forecast data into a flat array of hourly forecast objects
 */
function parseHourlyData(weatherData) {
    const forecastDays = weatherData.forecast.forecastday;
    const allHours = [];

    forecastDays.forEach(day => {
        day.hour.forEach(hour => {
            // WeatherAPI gives time as "2025-11-12 14:00" (no T, no Z — already local)
            const [date, timeStr] = hour.time.split(' ');
            const [year, month, day_] = date.split('-');
            const [h, minute] = timeStr.split(':');

            const localDate = new Date(year, month - 1, day_, h, minute || 0);

            allHours.push({
                time: localDate,
                temperature: hour.temp_f,
                feelsLike: hour.feelslike_f,
                precipChance: hour.chance_of_rain,
                weatherCode: hour.condition.code,
                isDay: hour.is_day === 1
            });
        });
    });

    return allHours;
}

/**
 * Get the current hour's forecast (or closest available)
 */
function getCurrentHourForecast(parsedData) {
    const now = new Date();
    return parsedData.reduce((closest, forecast) => {
        const currentDiff = Math.abs(now - forecast.time);
        const closestDiff = Math.abs(now - closest.time);
        return currentDiff < closestDiff ? forecast : closest;
    });
}

/**
 * Get a range of hours around the current time
 */
function getHourlyRange(parsedData, hoursBefore = 3, hoursAfter = 6, userOffsetMinutes = 0) {
    const nowUTC = new Date();
    const serverOffsetMinutes = nowUTC.getTimezoneOffset();
    const offsetDiff = serverOffsetMinutes - userOffsetMinutes;
    const nowUserTime = new Date(nowUTC.getTime() + offsetDiff * 60 * 1000);

    const currentIndex = parsedData.findIndex(forecast =>
        Math.abs(nowUserTime - forecast.time) < 30 * 60 * 1000
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
 * Convert WeatherAPI condition code to description
 */
function getWeatherDescription(code) {
    const descriptions = {
        1000: 'Clear',
        1003: 'Partly cloudy',
        1006: 'Cloudy',
        1009: 'Overcast',
        1030: 'Mist',
        1063: 'Patchy rain',
        1066: 'Patchy snow',
        1069: 'Patchy sleet',
        1072: 'Patchy freezing drizzle',
        1087: 'Thundery outbreaks',
        1114: 'Blowing snow',
        1117: 'Blizzard',
        1135: 'Fog',
        1147: 'Freezing fog',
        1150: 'Light drizzle',
        1153: 'Light drizzle',
        1168: 'Freezing drizzle',
        1171: 'Heavy freezing drizzle',
        1180: 'Light rain',
        1183: 'Light rain',
        1186: 'Moderate rain',
        1189: 'Moderate rain',
        1192: 'Heavy rain',
        1195: 'Heavy rain',
        1198: 'Light freezing rain',
        1201: 'Moderate freezing rain',
        1204: 'Light sleet',
        1207: 'Moderate sleet',
        1210: 'Light snow',
        1213: 'Light snow',
        1216: 'Moderate snow',
        1219: 'Moderate snow',
        1222: 'Heavy snow',
        1225: 'Heavy snow',
        1237: 'Ice pellets',
        1240: 'Light rain shower',
        1243: 'Moderate rain shower',
        1246: 'Heavy rain shower',
        1249: 'Light sleet shower',
        1252: 'Moderate sleet shower',
        1255: 'Light snow shower',
        1258: 'Moderate snow shower',
        1261: 'Light ice pellet shower',
        1264: 'Moderate ice pellet shower',
        1273: 'Light thunderstorm',
        1276: 'Thunderstorm',
        1279: 'Light snow thunderstorm',
        1282: 'Moderate snow thunderstorm',
    };

    return descriptions[code] || 'Unknown';
}

/**
 * Determine if a given time is during daytime.
 * WeatherAPI provides is_day directly on each hour, so we use that when available.
 */
function isDaytime(time, dailyData, isDay) {
    // Prefer the is_day flag from the parsed hour object
    if (typeof isDay === 'boolean') return isDay;

    // Fallback: 6 AM to 8 PM
    const hour = time.getHours();
    return hour >= 6 && hour < 20;
}

/**
 * Get the appropriate weather icon class
 */
function getWeatherIcon(code, isDay) {
    const prefix = 'wi wi-';

    const iconMap = {
        1000: isDay ? 'day-sunny' : 'night-clear',
        1003: isDay ? 'day-sunny-overcast' : 'night-alt-partly-cloudy',
        1006: isDay ? 'day-cloudy' : 'night-alt-cloudy',
        1009: 'cloudy',
        1030: 'fog',
        1063: isDay ? 'day-rain' : 'night-alt-rain',
        1066: isDay ? 'day-snow' : 'night-alt-snow',
        1069: 'sleet',
        1072: 'rain-mix',
        1087: isDay ? 'day-thunderstorm' : 'night-alt-thunderstorm',
        1114: 'snow-wind',
        1117: 'snow-wind',
        1135: 'fog',
        1147: 'fog',
        1150: 'sprinkle',
        1153: 'sprinkle',
        1168: 'rain-mix',
        1171: 'rain-mix',
        1180: 'rain',
        1183: 'rain',
        1186: 'rain',
        1189: 'rain',
        1192: 'rain',
        1195: 'rain',
        1198: 'rain-mix',
        1201: 'rain-mix',
        1204: 'sleet',
        1207: 'sleet',
        1210: 'snow',
        1213: 'snow',
        1216: 'snow',
        1219: 'snow',
        1222: 'snow',
        1225: 'snow',
        1237: 'hail',
        1240: 'showers',
        1243: 'showers',
        1246: 'rain',
        1249: 'sleet',
        1252: 'sleet',
        1255: isDay ? 'day-snow' : 'night-alt-snow',
        1258: isDay ? 'day-snow' : 'night-alt-snow',
        1261: 'hail',
        1264: 'hail',
        1273: isDay ? 'day-thunderstorm' : 'night-alt-thunderstorm',
        1276: 'thunderstorm',
        1279: 'storm-showers',
        1282: 'storm-showers',
    };

    const iconName = iconMap[code] || (isDay ? 'day-sunny' : 'night-clear');
    return prefix + iconName;
}

/**
 * Get today's sunrise and sunset times.
 * WeatherAPI returns these as strings like "06:48 AM" — we convert to Date objects.
 */
function getTodaySunTimes(dailyData) {
    if (!dailyData || !dailyData.forecastday || dailyData.forecastday.length === 0) {
        return { sunrise: null, sunset: null };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const today = dailyData.forecastday.find(d => d.date === todayStr);

    if (!today) return { sunrise: null, sunset: null };

    // Parse "06:48 AM" into a Date object for today
    function parseTimeStr(timeStr) {
        const [time, meridiem] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d;
    }

    return {
        sunrise: parseTimeStr(today.astro.sunrise),
        sunset: parseTimeStr(today.astro.sunset),
    };
}

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