import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

async function drawSecondaryEnrollmentScatter() {
  const width = 800;
  const height = 500;
  const margin = { top: 50, right: 40, bottom: 60, left: 70 };

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
          d[femaleCol] !== "" &&
          d[femaleCol] != null &&
          d[maleCol] !== "" &&
          d[maleCol] != null
      );
      if (valid.length === 0) return null;

      const latest = d3.greatest(valid, d => +d.Year);
      return {
        country: latest["Country Name"],
        year: +latest.Year,
        female: +latest[femaleCol],
        male: +latest[maleCol]
      };
    },
    d => d["Country Name"]
  );

  const data = Array.from(byCountry.values()).filter(d => d !== null);

  if (!data.length) {
    console.error("No valid data found for secondary enrollment.");
    return;
  }

  const xExtent = d3.extent(data, d => d.female);
  const yExtent = d3.extent(data, d => d.male);

  const x = d3.scaleLinear()
    .domain(xExtent).nice()
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain(yExtent).nice()
    .range([height - margin.bottom, margin.top]);

  const svg = d3.select("#secondary-enrollment-scatter")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y);

  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(xAxis);

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(yAxis);

  const minVal = Math.min(x.domain()[0], y.domain()[0]);
  const maxVal = Math.max(x.domain()[1], y.domain()[1]);

  svg.append("line")
    .attr("x1", x(minVal))
    .attr("y1", y(minVal))
    .attr("x2", x(maxVal))
    .attr("y2", y(maxVal))
    .attr("stroke", "#999")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4,4");

  // 7. Points (one per country)
  svg.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.female))
    .attr("cy", d => y(d.male))
    .attr("r", 4)
    .attr("fill", "#4f8bc9")
    .attr("opacity", 0.8);

  // 8. Title
  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", margin.top - 20)
    .attr("text-anchor", "middle")
    .text("Female vs Male Secondary School Enrollment (% gross) – Latest Year per Country");

  // 9. Axis labels
  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height - 20)
    .attr("text-anchor", "middle")
    .text("Female secondary enrollment (% gross)");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .text("Male secondary enrollment (% gross)");
}

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

drawSecondaryEnrollmentScatter();
drawSecondaryEnrollmentGapBar();
drawFemaleLifeExpectancyMap();


