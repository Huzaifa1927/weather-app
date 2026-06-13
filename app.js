const apiKey = "9e87a787ce17a3f4693cc4c829eb9010";

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const geoBtn = document.getElementById("geoBtn");
const weatherResult = document.getElementById("weatherResult");
const forecastBox = document.getElementById("forecast");
const errorMsg = document.getElementById("errorMsg");
const loader = document.getElementById("loader");
const themeToggle = document.getElementById("themeToggle");
const unitToggle = document.getElementById("unitToggle");
const recentSearchesBox = document.getElementById("recentSearches");

let currentUnit = "metric"; // metric = Celsius, imperial = Fahrenheit
let lastData = null; // store last fetched data for unit toggle

// ---------- THEME TOGGLE ----------
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// ---------- UNIT TOGGLE ----------
unitToggle.addEventListener("click", () => {
  currentUnit = currentUnit === "metric" ? "imperial" : "metric";
  unitToggle.textContent = currentUnit === "metric" ? "°F" : "°C";
  if (lastData) {
    displayWeather(lastData);
    if (lastData.coord) fetchForecast(lastData.coord.lat, lastData.coord.lon);
  }
});

// ---------- RECENT SEARCHES ----------
function getRecentSearches() {
  return JSON.parse(localStorage.getItem("recentSearches")) || [];
}

function saveRecentSearch(city) {
  let searches = getRecentSearches();
  searches = searches.filter(c => c.toLowerCase() !== city.toLowerCase());
  searches.unshift(city);
  searches = searches.slice(0, 5);
  localStorage.setItem("recentSearches", JSON.stringify(searches));
  renderRecentSearches();
}

function renderRecentSearches() {
  const searches = getRecentSearches();
  recentSearchesBox.innerHTML = searches
    .map(city => `<span data-city="${city}">${city}</span>`)
    .join("");

  document.querySelectorAll(".recent-searches span").forEach(span => {
    span.addEventListener("click", () => {
      cityInput.value = span.dataset.city;
      getWeather();
    });
  });
}

renderRecentSearches();

// ---------- SEARCH EVENTS ----------
searchBtn.addEventListener("click", getWeather);

cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    getWeather();
  }
});

// ---------- GEOLOCATION ----------
geoBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    errorMsg.textContent = "Geolocation not supported by your browser.";
    return;
  }

  showLoader(true);
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      await fetchWeatherByCoords(latitude, longitude);
    },
    () => {
      showLoader(false);
      errorMsg.textContent = "Unable to retrieve your location.";
    }
  );
});

// ---------- LOADER ----------
function showLoader(show) {
  loader.classList.toggle("show", show);
}

// ---------- MAIN SEARCH ----------
async function getWeather() {
  const city = cityInput.value.trim();

  if (city === "") {
    errorMsg.textContent = "Please enter a city name.";
    weatherResult.classList.remove("show");
    forecastBox.classList.remove("show");
    return;
  }

  showLoader(true);
  weatherResult.classList.remove("show");
  forecastBox.classList.remove("show");
  errorMsg.textContent = "";

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${currentUnit}&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("City not found");

    const data = await response.json();
    lastData = data;
    displayWeather(data);
    saveRecentSearch(data.name);
    await fetchForecast(data.coord.lat, data.coord.lon);

  } catch (error) {
    errorMsg.textContent = "City not found. Try again!";
    weatherResult.classList.remove("show");
    forecastBox.classList.remove("show");
  } finally {
    showLoader(false);
  }
}

// ---------- FETCH BY COORDS (Geolocation) ----------
async function fetchWeatherByCoords(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Location not found");

    const data = await response.json();
    lastData = data;
    cityInput.value = data.name;
    displayWeather(data);
    saveRecentSearch(data.name);
    await fetchForecast(lat, lon);
    errorMsg.textContent = "";

  } catch (error) {
    errorMsg.textContent = "Could not fetch weather for your location.";
  } finally {
    showLoader(false);
  }
}

// ---------- DISPLAY CURRENT WEATHER ----------
function displayWeather(data) {
  const { name, main, weather, wind } = data;
  const iconCode = weather[0].icon;
  const tempUnit = currentUnit === "metric" ? "°C" : "°F";
  const speedUnit = currentUnit === "metric" ? "m/s" : "mph";

  weatherResult.innerHTML = `
    <h2>${name}</h2>
    <img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="weather icon">
    <div class="temp">${Math.round(main.temp)}${tempUnit}</div>
    <div class="description">${weather[0].description}</div>
    <div class="details">
      <div>💧 Humidity<br>${main.humidity}%</div>
      <div>💨 Wind<br>${wind.speed} ${speedUnit}</div>
      <div>🌡️ Feels like<br>${Math.round(main.feels_like)}${tempUnit}</div>
    </div>
  `;

  weatherResult.classList.add("show");
  updateBackground(weather[0].main);
}

// ---------- BACKGROUND BASED ON WEATHER ----------
function updateBackground(condition) {
  document.body.classList.remove("sunny", "rainy", "cloudy", "snowy");

  const c = condition.toLowerCase();

  if (c.includes("clear")) {
    document.body.classList.add("sunny");
  } else if (c.includes("rain") || c.includes("drizzle") || c.includes("thunderstorm")) {
    document.body.classList.add("rainy");
  } else if (c.includes("cloud")) {
    document.body.classList.add("cloudy");
  } else if (c.includes("snow")) {
    document.body.classList.add("snowy");
  }
}

// ---------- 5-DAY FORECAST ----------
async function fetchForecast(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Forecast not available");

    const data = await response.json();
    displayForecast(data.list);

  } catch (error) {
    forecastBox.classList.remove("show");
  }
}

function displayForecast(list) {
  // Pick one forecast per day, around midday (12:00:00)
  const dailyData = list.filter(item => item.dt_txt.includes("12:00:00")).slice(0, 5);

  const tempUnit = currentUnit === "metric" ? "°C" : "°F";

  forecastBox.innerHTML = dailyData.map(day => {
    const date = new Date(day.dt * 1000);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const icon = day.weather[0].icon;
    const temp = Math.round(day.main.temp);

    return `
      <div class="forecast-day">
        <div>${dayName}</div>
        <img src="https://openweathermap.org/img/wn/${icon}.png" alt="icon">
        <div>${temp}${tempUnit}</div>
      </div>
    `;
  }).join("");

  forecastBox.classList.add("show");
}