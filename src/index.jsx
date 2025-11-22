
import data from "../daten.csv";
import { render } from "solid-js/web";
import { createSignal, createEffect } from "solid-js";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

function toNum(v){
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// [
//     ".",
//     "04/2024-03/2025",
//     "04/2025-03/2026",
//     "Minimum 04/2018-03/2021",
//     "Maximum 04/2018-03/2021"
// ]
const header = data.header;

const rows = data.rows;

const idxDayMonth = 0; // %d.%m.
const idxLastYear = 1;
const idxThisYear = 2;
const idxMin = 3;
const idxMax = 4;

function parseDayMonth(str, year) {
  // Beispiel: "22.11."
  const [day, month] = str.replace(/\.$/, "").split(".").map(Number);
  return Date.UTC(year, month - 1, day);  // Unix Timestamp (ms)
}

// "04/2025-03/2026" -> 2025
const thisFirstYear = Number(header[idxThisYear].replace(/[0-9]+\/([0-9]+)-[0-9]+\/([0-9]+)/, "$1"));

const arrLastYear = rows.map(r => toNum(r[idxLastYear]));

const arrThisYearLength = (() => {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][idxThisYear] == null) {
      // length = i = (i - 1) + 1
      return i;
    }
  }
  return -1;
})();

console.log("arrThisYearLength", arrThisYearLength);

const arrThisYear = rows.slice(0, arrThisYearLength).map(r => toNum(r[idxThisYear]));

// rows[0][0] = "01.04."
const firstDayTime = parseDayMonth(rows[0][0], thisFirstYear) / 1000;

// 86400 == 24 * 60 * 60
// const arrThisYearTime = Array.from({ length: 365 * 2 }).map((_, idx) => firstDayTime + idx * 86400);
// chrome: 21.11.
// firefox: 22.11.
const arrThisYearTime = Array.from({ length: arrThisYear.length + arrLastYear.length }).map((_, idx) => firstDayTime + idx * 86400);
// FIXME why (idx + 1)
// const arrThisYearTime = Array.from({ length: arrThisYear.length + arrLastYear.length }).map((_, idx) => firstDayTime + (idx + 1) * 86400);

const arrLastThisYear = arrLastYear.concat(arrThisYear);

// find last two real points
let last = -1, prev = -1;
// loop in reverse order
console.log(`arrThisYear.length = ${arrThisYear.length}`)
for (let i = arrThisYear.length - 1; i >= 0; i--) {
  console.log(`arrThisYear[${i}] = ${arrThisYear[i]}`)
  if (arrThisYear[i] == null) {
    continue
  }
  if (last === -1) {
    last = i;
    continue
  }
  prev = i;
  break;
}
// const last = arrThisYearLength - 1;
// const prev = arrThisYearLength - 2;
console.log(`last = ${last}`)

// const thisYearTimeLast = arrThisYearTime[last];
// FIXME why +1
const thisYearTimeLast = arrThisYearTime[last];
const thisYearValueLast = arrThisYear[last];

// extrapolate linear
const arrThisYearExtrapolatedLinear = new Array(arrThisYear.length * 2).fill(null);
if(prev!==-1 && last!==-1){
  const y0 = arrThisYear[prev], y1 = arrThisYear[last];
  const slope = (y1 - y0) / (last - prev);
  for(let i = last + 1; i < arrThisYear.length * 2; i++) {
  // for(let i = last + 1; i < arrLastYear.length + arrThisYear.length; i++) {
    arrThisYearExtrapolatedLinear[i] = +(y1 + slope * (i - last)).toFixed(2);
    if (arrThisYearExtrapolatedLinear[i] < 0) {
      arrThisYearExtrapolatedLinear[i] = null;
    }
  }
}

// extrapolate copy
const arrThisYearExtrapolatedCopy = new Array(arrThisYear.length * 2).fill(null);
const offsetLastThisYear = arrLastYear[last] - arrThisYear[last];
for (let i = last + 1; i < arrLastYear.length; i++) {
  if (arrLastYear[i] !== null) {
    arrThisYearExtrapolatedCopy[i] = arrLastYear[i] - offsetLastThisYear;
  }
}
for (let i = 0; i < arrThisYear.length; i++) {
  if (arrThisYear[i] !== null) {
    arrThisYearExtrapolatedCopy[arrLastYear.length + i] = arrThisYear[i] - offsetLastThisYear;
  }
}

function repeatArray(arr) {
  return arr.concat(arr);
}

// fix outlier in min values:
// 26,09
// 25,91
// 26,39
// 53,98 // outlier: double of expected value
function fixLastOutlier(arr) {
  const L = arr.length;
  if (L <= 2) return;
  const maxFactor = 1.5; // good: about 1.1 - bad: about 2
  if (arr[L-1] / arr[L-2] > maxFactor) {
    arr[L-1] = arr[L-1] / 2;
  }
  return arr;
}

const arrMin = repeatArray(fixLastOutlier(rows.map(r => toNum(r[idxMin]))));

const arrMax = repeatArray(rows.map(r => toNum(r[idxMax])));

console.dir({
  header, rows, arrThisYearTime, arrLastYear, arrThisYear,
  arrThisYearExtrapolatedLinear,
  arrThisYearExtrapolatedCopy,
  arrMin, arrMax,
});

// <h1>Offline SolidJS + uPlot</h1>
function App(){
  return (
    <div>
      <h1>Gasspeicher Deutschland Füllstände</h1>
      <div id="chart"></div>
      <div>
        Quelle:
        {" "}
        <a href="https://www.bundesnetzagentur.de/DE/Gasversorgung/aktuelle_gasversorgung/_svg/Gasspeicher_Fuellstand/Speicherfuellstand.html?nn=652300"
        >Bundesnetzagentur</a>,
        Stand {formatFullDate(thisYearTimeLast)} ({thisYearValueLast}%)
      </div>
      <div>
        Unter 30%: Reduzierte Gasflussgeschwindigkeit
      </div>
      <div>
        Siehe auch:
        <ul>
          <li>
            <a href="https://energien-speichern.de/ines-gas-szenarien-winterausblick-zeigt-risiken-speicherbefuellung-vor-dem-winter-auf-niedrigem-niveau/"
            >INES-Gas-Szenarien: Winterausblick zeigt Risiken - Speicherbefüllung vor dem Winter auf niedrigem Niveau</a>
            {" "}-{" "}
            18.11.2025
          </li>
          <li>
            <a href="https://www.youtube.com/watch?v=YabhiIoLa2I"
            >Alarm! - Gasspeicherbetreiber warnen vor Gasmangellage im Februar</a>
            {" "}-{" "}
            <a href="https://www.youtube.com/@OutdoorChiemgau">Outdoor Chiemgau</a>
            {" "}-{" "}
            18.11.2025
          </li>
          <li>
            <a href="https://www.youtube.com/watch?v=wQHpgjAvj4E"
            >Schock: Gas reicht bei normalen Winter nicht! Lügen & Inkompetenz der Regierung werden Tote fordern!</a>
            {" "}-{" "}
            <a href="https://www.youtube.com/@PolitikmitKopf">Politik mit Kopf</a>
            {" "}-{" "}
            18.11.2025
          </li>
          <li>
            <a href="https://www.youtube.com/watch?v=jZWzWIx5FB0"
            >Rekordverstromung, Tiefster Speicherfüllstand seit Aufzeichnung & eine Warnung aus Den Haag!</a>
            {" "}-{" "}
            <a href="https://www.youtube.com/@PolitikmitKopf">Politik mit Kopf</a>
            {" "}-{" "}
            23.11.2025
          </li>
          <li>
            <a href="https://github.com/milahu/alchi/issues/56#issuecomment-3568254490"
            >schlechte nachrichten - mit vollgas weiter in den abgrund!!</a>
            {" "}-{" "}
            <a href="https://github.com/milahu">milahu</a>
            {" "}-{" "}
            23.11.2025
          </li>
          <li>
            <a href="https://github.com/milahu/gasspeicher-deutschland"
            >github.com/milahu/gasspeicher-deutschland</a>
          </li>
        </ul>
      </div>
    </div>
  );
}

function getLabel(h) {
  // "04/2024-03/2025" -> "2024/2025"
  return h.replace(/[0-9]+\/([0-9]+)-[0-9]+\/([0-9]+)/, "$1/$2");
}

const labelLastYear = getLabel(header[idxLastYear]);
const labelThisYear = getLabel(header[idxThisYear]);

render(App, document.body);

function formatFullDate(ts) {
  const d = new Date(ts * 1000);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  return `${dd}.${mm}.${yyyy}`;
}

function formatDate(ts) {
  const d = new Date(ts * 1000);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.`;
}

const lightTheme = {
  background: "white",
  axes: "black",
  grid: "#bfbfbf", // 25% black
};

const darkTheme = {
  background: "black",
  axes: "white",
  grid: "#404040", // 75% black
};

function applyTheme(u, t) {
  console.log(`applyTheme t=${t}`)
  // console.log("applyTheme u", u)
  if (uplotInstance) uplotInstance.destroy();
  const chartParentElement = document.getElementById("chart");
  uplotInstance = getUplotInstance(chartParentElement, t);
  return;

  const theme = t == "dark" ? darkTheme : lightTheme;

  // Chart Hintergrund
  // u.over.style.background = theme.background;

  // Axis Labels
  u.root.querySelectorAll(".u-axis text").forEach(el => {
    el.style.fill = theme.axes;
  });

  // Gridlines
  u.root.querySelectorAll(".u-grid line").forEach(el => {
    el.style.stroke = theme.grid;
  });

  u.axes.forEach((axis, i) => {
    axis.stroke = theme.axisStroke;
    axis.grid.stroke = theme.gridStroke;
    axis.color = theme.axisText;
  });

  u.redraw();
}

let uplotInstance = null;

function getUplotInstance(chartParentElement, theme="light") {
  const isLight = theme == "light";
  return new uPlot(
    {
      // drawOrder: ["series", "axes"],
      width: 1000,
      height: 400,
      series: [
        {
          // arrThisYearTime
          label: "Tag",
          value: (u, v) => formatDate(v),
        },
        {label: labelLastYear, stroke: "blue", width: 2},
        {label: labelThisYear, stroke: "orange", width: 2},
        // {label: `${labelThisYear} extrapoliert linear`, stroke: "red", width: 2},
        // {label: `${labelThisYear} extrapoliert kopie`, stroke: "red", width: 2},
        {label: `${labelThisYear} extrapoliert`, stroke: "red", width: 2},
        {label: "min", stroke: "grey", width: 1},
        {label: "max", stroke: "grey", width: 1},
      ],
      scales: {
        x: {
          time: true,
        },
      },
      axes: [
        {
          // x-Achse
          scale: "x",
          // format callback für jedes Tick-Label
          values: (u, ticks) => ticks.map(t => {
            const d = new Date(t * 1000);
            // const dd = String(d.getDate()).padStart(2, "0");
            // const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = d.getDate();
            const mm = d.getMonth() + 1;
            return `${dd}.${mm}.`;
          }),
          stroke: isLight ? "black" : "white",
          grid: {
            // vertical grid lines
            show: true,
            // stroke: isLight ? "#404040" : "#bfbfbf", // 75% black | 25% black
            stroke: isLight ? "#bfbfbf" : "#404040", // 25% black | 75% black
            width: 1,
          },
          ticks: {
            show: true,
            stroke: isLight ? "black" : "white",
            width: 1,
          }
        },
        {
          // y-Achse
          stroke: isLight ? "black" : "white",
          grid: {
            // horizontal grid lines
            show: true,
            stroke: isLight ? "#bfbfbf" : "#404040", // 25% black | 75% black
            // stroke: isLight ? "#bfbfbf" : "green", // 25% black | xxx black
            // stroke: isLight ? "#404040" : "#bfbfbf", // 75% black | 25% black
            width: 1,
          },
          ticks: {
            show: true,
            stroke: isLight ? "black" : "white",
            width: 1,
          }
        },
      ],
    },
    [
      arrThisYearTime,
      // arrLastYear,
      arrLastThisYear,
      arrThisYear,
      // arrThisYearExtrapolatedLinear,
      arrThisYearExtrapolatedCopy,
      arrMin,
      arrMax,
    ],
    chartParentElement,
  );
}

// function detectDark() {
//   return window.matchMedia("(prefers-color-scheme: dark)").matches;
// }

function detectDark() {
  // const backgroundColor = getComputedStyle(document.documentElement).backgroundColor
  // console.log("backgroundColor:", getComputedStyle(document.documentElement).backgroundColor)
  const darkreaderScheme = document.documentElement.getAttribute("data-darkreader-scheme")
  // console.log("darkreaderScheme:", darkreaderScheme)
  // FIXME make this work without darkreader
  // backgroundColor: rgba(0, 0, 0, 0) // light // why not white?
  // backgroundColor: rgb(24, 26, 27) // dark // why not black?
  const isDark = (
    // backgroundColor != "rgb(255, 255, 255)" ||
    darkreaderScheme == "dark"
  );
  return isDark;
}

setTimeout(() => {

  const chartParentElement = document.getElementById("chart");
  const theme = detectDark() ? "dark" : "light";
  uplotInstance = getUplotInstance(chartParentElement, theme);

  if (0) {
    setTimeout(() => {
      applyTheme(uplotInstance, detectDark() ? "dark" : "light");
    }, 0);
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)");

  media.addEventListener("change", e => {
    applyTheme(uplotInstance, e.matches ? "dark" : "light");
  });

  const obs = new MutationObserver(() => {
    // const backgroundColor = getComputedStyle(document.documentElement).backgroundColor
    // console.log("backgroundColor:", getComputedStyle(document.documentElement).backgroundColor)
    // const darkreaderScheme = document.documentElement.getAttribute("data-darkreader-scheme")
    // console.log("darkreaderScheme:", darkreaderScheme)
    // // FIXME make this work without darkreader
    // // backgroundColor: rgba(0, 0, 0, 0) // light // why not white?
    // // backgroundColor: rgb(24, 26, 27) // dark // why not black?
    // const isDark = (
    //   // backgroundColor != "rgb(255, 255, 255)" ||
    //   darkreaderScheme == "dark"
    // );
    // applyTheme(uplotInstance, isDark ? "dark" : "light");
    const theme = detectDark() ? "dark" : "light";
    applyTheme(uplotInstance, theme);
  });

  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style", "class", "data-darkreader-scheme"]
  });

}, 0);
