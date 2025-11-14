import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

async function drawSecondaryEnrollmentGapBar() {
  const width = 800;
  const height = 500;
  const margin = { top: 50, right: 40, bottom: 120, left: 80 };

  const femaleCol =
    "average_value_School enrollment, secondary, female (% gross)";
  const maleCol =
    "average_value_School enrollment, secondary, male (% gross)";

  const raw = await d3.csv("data/gender.csv");

  const byCountry = d3.rollup(
    raw,
    rows => {
      const valid = rows.filter(
        d =>
          d[femaleCol] !== "" && d[femaleCol] != null &&
          d[maleCol] !== "" && d[maleCol] != null
      );
      if (valid.length === 0) return null;
      const latest = d3.greatest(valid, d => +d.Year);
      const female = +latest[femaleCol];
      const male = +latest[maleCol];
      return {
        country: latest["Country Name"],
        year: +latest.Year,
        female,
        male,
        gap: female - male 
      };
    },
    d => d["Country Name"]
  );

  let data = Array.from(byCountry.values()).filter(d => d !== null);

  if (!data.length) {
    console.error("No valid data for secondary enrollment gap.");
    return;
  }

  data = data
    .filter(d => isFinite(d.gap))
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
    .slice(0, 15);

  const x = d3.scaleBand()
    .domain(data.map(d => d.country))
    .range([margin.left, width - margin.right])
    .padding(0.3);

  const minGap = d3.min(data, d => d.gap);
  const maxGap = d3.max(data, d => d.gap);

  const y = d3.scaleLinear()
    .domain([minGap, maxGap]).nice()
    .range([height - margin.bottom, margin.top]);

  const svg = d3.select("#secondary-enrollment-gap-bar")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  svg.append("line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", y(0))
    .attr("y2", y(0))
    .attr("stroke", "#888")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4,4");

  svg.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.country))
    .attr("y", d => d.gap >= 0 ? y(d.gap) : y(0))
    .attr("width", x.bandwidth())
    .attr("height", d => Math.abs(y(d.gap) - y(0)))
    .attr("fill", d => d.gap >= 0 ? "#4caf50" : "#e57373"); // green: more girls, red: more boys

  svg.selectAll("text.bar-label")
    .data(data)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.country) + x.bandwidth() / 2)
    .attr("y", d => d.gap >= 0 ? y(d.gap) - 5 : y(d.gap) + 15)
    .attr("text-anchor", "middle")
    .text(d => d.gap.toFixed(1));

  const xAxis = d3.axisBottom(x);

  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(xAxis)
    .selectAll("text")
    .style("font-size", "11px")
    .attr("transform", "rotate(-45)")
    .attr("text-anchor", "end");

  const yAxis = d3.axisLeft(y);

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(yAxis);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top - 20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Gender Gap in Secondary School Enrollment (% gross), Top 15 Countries");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 30)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Country (top 15 by absolute gap)");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Gap = Female − Male (% gross)");
}

async function drawFemaleLifeExpectancyMap() {
  const width = 800;
  const height = 500;

  const femaleCol =
    "average_value_Life expectancy at birth, female (years)";

  const raw = await d3.csv("data/gender.csv");

  const byCountry = d3.rollup(
    raw,
    rows => {
      const valid = rows.filter(
        d => d[femaleCol] !== "" && d[femaleCol] != null
      );
      if (valid.length === 0) return null;
      const latest = d3.greatest(valid, d => +d.Year);
      return {
        country: latest["Country Name"],
        value: +latest[femaleCol]
      };
    },
    d => d["Country Name"]
  );

  const data = Array.from(byCountry.values()).filter(d => d !== null);

  if (!data.length) {
    console.error("No valid female life expectancy data found.");
    return;
  }

  const valueMap = new Map(data.map(d => [d.country, d.value]));

  const minVal = d3.min(data, d => d.value);
  const maxVal = d3.max(data, d => d.value);

  const color = d3.scaleSequential()
    .domain([minVal, maxVal])
    .interpolator(d3.interpolateBlues);

  const world = await d3.json(
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
  );
  const countries = feature(world, world.objects.countries).features;

  const projection = d3.geoNaturalEarth1()
    .fitSize([width, height], { type: "FeatureCollection", features: countries });
  const path = d3.geoPath(projection);

  const svg = d3.select("#female-lifeexp-map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const tooltip = d3.select("#map-tooltip");

  svg.selectAll("path")
    .data(countries)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const name = d.properties.name;
      const v = valueMap.get(name);
      return v != null ? color(v) : "#eee";
    })
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5)
    .on("mousemove", (event, d) => {
      const name = d.properties.name;
      const v = valueMap.get(name);

      tooltip
        .style("opacity", 1)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px")
        .html(`
          <strong>${name}</strong><br/>
          Female life expectancy: ${
            v != null ? v.toFixed(1) + " years" : "No data"
          }
        `);
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    });

  const legend = d3.select("#map-legend");
  legend.html(""); 

  legend.append("div")
    .attr("class", "legend-bar")
    .style(
      "background",
      `linear-gradient(to right, ${d3.interpolateBlues(0)}, ${d3.interpolateBlues(1)})`
    );

  legend.append("div")
    .html(`${minVal.toFixed(1)} &nbsp;–&nbsp; ${maxVal.toFixed(1)} years`);
}

drawSecondaryEnrollmentGapBar();
drawFemaleLifeExpectancyMap();

// ======================================================
// --- VISUAL 1: Grouped Bar Chart (Region x Gender x Education)
// ======================================================

const margin1 = { top: 80, right: 80, bottom: 100, left: 100 };
const width1 = 1200 - margin1.left - margin1.right;
const height1 = 700 - margin1.top - margin1.bottom;

const svg1 = d3.select("#chart-region")
  .append("svg")
  .attr("width", width1 + margin1.left + margin1.right)
  .attr("height", height1 + margin1.top + margin1.bottom)
  .append("g")
  .attr("transform", `translate(${margin1.left},${margin1.top})`);

const x0 = d3.scaleBand().padding(0.15).range([0, width1]);
const x1 = d3.scaleBand().padding(0.05);
const y1 = d3.scaleLinear().range([height1, 0]);
const color = d3.scaleOrdinal().domain(["Female", "Male"]).range(["#e07a9a", "#619bff"]);

d3.csv("data/education_long_with_regions.csv").then((data) => {
  data.forEach(d => d.EnrollmentRate = +d.EnrollmentRate);
  const regions = [...new Set(data.map(d => d.Region))].filter(Boolean).sort();

  const dropdown = d3.select("#regionSelect");
  dropdown.selectAll("option")
    .data(regions)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  let selectedRegion = regions[0];

  function updateChart(region) {
    selectedRegion = region;
    const filtered = data.filter(d => d.Region === region);

    const aggregated = Array.from(
      d3.rollup(
        filtered,
        v => d3.mean(v, d => d.EnrollmentRate),
        d => d.EducationLevel,
        d => d.Gender
      ),
      ([EducationLevel, genderMap]) => ({
        EducationLevel,
        Female: genderMap.get("Female"),
        Male: genderMap.get("Male")
      })
    );

    const genders = ["Female", "Male"];
    x0.domain(aggregated.map(d => d.EducationLevel));
    x1.domain(genders).range([0, x0.bandwidth()]);
    y1.domain([0, d3.max(aggregated, d => Math.max(d.Female, d.Male)) * 1.1]);

    svg1.selectAll(".x-axis").remove();
    svg1.selectAll(".y-axis").remove();

    svg1.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height1})`)
      .call(d3.axisBottom(x0))
      .selectAll("text")
      .style("font-size", "16px");

    svg1.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y1).ticks(8))
      .selectAll("text")
      .style("font-size", "16px");

    const groups = svg1.selectAll(".level-group").data(aggregated);
    const groupsEnter = groups.enter()
      .append("g")
      .attr("class", "level-group")
      .attr("transform", d => `translate(${x0(d.EducationLevel)},0)`);

    const mergedGroups = groupsEnter.merge(groups);

    mergedGroups.selectAll("rect")
      .data(d => genders.map(g => ({ key: g, value: d[g] })))
      .join("rect")
      .attr("x", d => x1(d.key))
      .attr("width", x1.bandwidth())
      .attr("fill", d => color(d.key))
      .transition()
      .duration(800)
      .attr("y", d => y1(d.value))
      .attr("height", d => height1 - y1(d.value));

    groups.exit().remove();

    svg1.selectAll(".y-label").remove();
    svg1.append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height1 / 2)
      .attr("y", -70)
      .style("font-size", "18px")
      .text("Enrollment Rate (%)");

    svg1.selectAll(".title").remove();
    svg1.append("text")
      .attr("class", "title")
      .attr("x", width1 / 2)
      .attr("y", -30)
      .attr("text-anchor", "middle")
      .attr("font-size", "24px")
      .attr("font-weight", "bold")
      .text(`Average Enrollment by Gender — ${region}`);
  }

  updateChart(selectedRegion);
  dropdown.on("change", function () { updateChart(this.value); });

  const legend = svg1.append("g").attr("transform", `translate(${width1 - 160}, 0)`);
  ["Female", "Male"].forEach((g, i) => {
    legend.append("rect")
      .attr("x", 0)
      .attr("y", i * 25)
      .attr("width", 16)
      .attr("height", 16)
      .attr("fill", color(g));
    legend.append("text")
      .attr("x", 26)
      .attr("y", i * 25 + 12)
      .attr("font-size", "16px")
      .text(g);
  });
});



// ======================================================
// --- VISUAL 2: Stacked Bar Chart (Income x Gender x Education)
// ======================================================

const margin2 = { top: 70, right: 100, bottom: 70, left: 90 };
const width2 = 700 - margin2.left - margin2.right;
const height2 = 500 - margin2.top - margin2.bottom;

const svg2 = d3.select("#chart-income")
  .append("svg")
  .attr("width", width2 + margin2.left + margin2.right)
  .attr("height", height2 + margin2.top + margin2.bottom)
  .append("g")
  .attr("transform", `translate(${margin2.left},${margin2.top})`);

const color2 = d3.scaleOrdinal()
  .domain(["Female", "Male"])
  .range(["#e07a9a", "#619bff"]);

const incomeOrder = ["Low income", "Lower middle income", "Upper middle income", "High income"];
const educationLevels = ["Primary", "Secondary", "Tertiary"];

// --- Dropdown for Education Level ---
const eduSelect = d3.select("body")
  .insert("div", "#chart-income")
  .style("margin-top", "20px")
  .style("text-align", "center")
  .html(`
    <label for="eduDropdown">Select Education Level:</label>
    <select id="eduDropdown"></select>
  `);

d3.select("#eduDropdown")
  .selectAll("option")
  .data(educationLevels)
  .enter()
  .append("option")
  .attr("value", d => d)
  .text(d => d);

let currentLevel = "Primary";

d3.csv("data/education_long_with_regions.csv").then(data => {
    data.forEach(d => {
    d.EnrollmentRate = +d.EnrollmentRate;
    d.IncomeGroup = d.IncomeGroup?.trim();
    d.EducationLevel = d.EducationLevel?.trim();
    d.Gender = d.Gender?.trim();
  });

  // ✅ Filter out unknown/missing income groups
  data = data.filter(d => incomeOrder.includes(d.IncomeGroup));


  function updateStacked(level) {
    currentLevel = level;
    const filtered = data.filter(d => d.EducationLevel === level);

    // Aggregate by IncomeGroup → sum female/male
    const grouped = d3.rollups(
      filtered,
      v => ({
        Female: d3.mean(v.filter(d => d.Gender === "Female"), d => d.EnrollmentRate) || 0,
        Male: d3.mean(v.filter(d => d.Gender === "Male"), d => d.EnrollmentRate) || 0
      }),
      d => d.IncomeGroup
    ).map(([IncomeGroup, obj]) => ({ IncomeGroup, ...obj }));

    const stackedData = d3.stack()
      .keys(["Female", "Male"])
      (grouped);

    const x = d3.scaleBand()
      .domain(incomeOrder)
      .range([0, width2])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(grouped, d => d.Female + d.Male) * 1.1])
      .range([height2, 0]);

    svg2.selectAll("*").remove();

    // Axes
    svg2.append("g")
      .attr("transform", `translate(0,${height2})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("font-size", "14px")
      .attr("transform", "rotate(-25)")
      .style("text-anchor", "end");

    svg2.append("g")
      .call(d3.axisLeft(y).ticks(6))
      .selectAll("text")
      .style("font-size", "14px");

    // Bars
    svg2.selectAll(".layer")
      .data(stackedData)
      .join("g")
      .attr("fill", d => color2(d.key))
      .selectAll("rect")
      .data(d => d)
      .join("rect")
      .attr("x", d => x(d.data.IncomeGroup))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth())
      .append("title")
      .text(d => `${d.data.IncomeGroup}
Female: ${d.data.Female.toFixed(1)}%
Male: ${d.data.Male.toFixed(1)}%`);

    // Labels
    svg2.append("text")
      .attr("x", width2 / 2)
      .attr("y", -30)
      .attr("text-anchor", "middle")
      .attr("font-size", "22px")
      .attr("font-weight", "bold")
      .text(`${level} Education — Enrollment by Income & Gender`);

    svg2.append("text")
      .attr("x", -height2 / 2)
      .attr("y", -60)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .text("Enrollment Rate (%)");

    // Legend
    const legend = svg2.append("g")
      .attr("transform", `translate(${width2 - 180}, 0)`);

    ["Female", "Male"].forEach((g, i) => {
      legend.append("rect")
        .attr("x", 0)
        .attr("y", i * 25)
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", color2(g));
      legend.append("text")
        .attr("x", 25)
        .attr("y", i * 25 + 13)
        .attr("font-size", "14px")
        .text(g);
    });
  }

  updateStacked(currentLevel);
  d3.select("#eduDropdown").on("change", function() {
    updateStacked(this.value);
  });
});
