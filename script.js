const margin = {top: 20, right: 60, bottom: 30, left: 60},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const parseTime = d3.timeParse("%Y-%m-%d");
const x = d3.scaleTime().range([0, width]);
const y0 = d3.scaleLinear().range([height, 0]);
const y1 = d3.scaleLinear().range([height, 0]);
const y2 = d3.scaleLinear().range([height, 0]);
const y3 = d3.scaleLinear().range([height, 0]);

const lineMortgage = d3.line().x(d => x(d.DATE)).y(d => y0(d.MORTGAGE30US));
const linePrice = d3.line().x(d => x(d.DATE)).y(d => y1(d.MSPUS));
const lineMortgageCost = d3.line().x(d => x(d.DATE)).y(d => y2(d.MONTHLYCOST));
const lineMortgageCostPercentage = d3.line().x(d => x(d.DATE)).y(d => y3(d.MORTGAGECOSTPERCENTAGE));

// State variables
let currentScene = 0;
let data = {
    mortgageData: [],
    priceData: [],
    mortgageCostData: [],
    mortgageCostPercentageData: []
};

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "#f9f9f9")
    .style("border", "1px solid #d3d3d3")
    .style("padding", "10px")
    .style("pointer-events", "none")
    .style("display", "none");

function updateTooltip(event, mouseDate, mortgagePoint, pricePoint) {
    tooltip.html(`
        <strong>Date:</strong> ${d3.timeFormat("%Y-%m-%d")(mouseDate)}<br>
        <strong>Mortgage Rate:</strong> ${(mortgagePoint.MORTGAGE30US * 100).toFixed(2)}%<br>
        <strong>Median Sales Price:</strong> $${pricePoint.MSPUS.toFixed(2)}
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 20) + "px")
    .style("display", "block");
}

function updateDots(g, xScale, yScale, data, mouseDate, className, color) {
    const bisectDate = d3.bisector(d => d.DATE).left;
    const index = bisectDate(data, mouseDate, 1);
    const point = data[index - 1] || data[index];

    g.selectAll(`.${className}`).remove();

    g.append("circle")
        .attr("class", className)
        .attr("cx", xScale(point.DATE))
        .attr("cy", yScale(point[className.toUpperCase()]))
        .attr("r", 5)
        .style("fill", color)
        .style("stroke", "black")
        .style("stroke-width", 1.5);
}

function updateTooltip2(event, mouseDate, mortgagePoint, pricePoint, monthlyCostPoint) {
    const mortgageRate = mortgagePoint?.MORTGAGE30US ? (mortgagePoint.MORTGAGE30US * 100).toFixed(2) : "N/A";
    const medianSalesPrice = pricePoint?.MSPUS ? pricePoint.MSPUS.toFixed(2) : "N/A";
    const monthlyCost = monthlyCostPoint?.MONTHLYCOST ? monthlyCostPoint.MONTHLYCOST.toFixed(2) : "N/A";

    tooltip.html(`
        <strong>Date:</strong> ${d3.timeFormat("%Y-%m-%d")(mouseDate)}<br>
        <strong>Monthly Mortgage Cost:</strong> $${monthlyCost}<br>
        <strong>Mortgage Rate:</strong> ${mortgageRate}%<br>
        <strong>Median Sales Price:</strong> $${medianSalesPrice}
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 20) + "px")
    .style("display", "block");
}

function updateDots2(g, xScale, yScale, data, mouseDate, className, valueKey, color) {
    const bisectDate = d3.bisector(d => d.DATE).left;
    const index = bisectDate(data, mouseDate, 1);
    const point = data[index - 1] || data[index];

    g.selectAll(`.${className}`).remove();

    g.append("circle")
        .attr("class", className)
        .attr("cx", xScale(point.DATE))
        .attr("cy", yScale(point[valueKey]))
        .attr("r", 5)
        .style("fill", color)
        .style("stroke", "black")
        .style("stroke-width", 1.5);
}

function updateTooltip3(event, mouseDate, monthlyCostPercentagePoint) {
    const mortgageCostPercentage = monthlyCostPercentagePoint?.MORTGAGECOSTPERCENTAGE ? (monthlyCostPercentagePoint.MORTGAGECOSTPERCENTAGE * 100).toFixed(2) : "N/A";

    tooltip.html(`
        <strong>Date:</strong> ${d3.timeFormat("%Y-%m-%d")(mouseDate)}<br>
        <strong>Mortgage Cost as a % of Median Family Income:</strong> ${mortgageCostPercentage}%
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 20) + "px")
    .style("display", "block");
}

function updateDots3(g, xScale, yScale, data, mouseDate, className, valueKey, color) {
    const bisectDate = d3.bisector(d => d.DATE).left;
    const index = bisectDate(data, mouseDate, 1);
    const point = data[index - 1] || data[index];

    g.selectAll(`.${className}`).remove();

    g.append("circle")
        .attr("class", className)
        .attr("cx", xScale(point.DATE))
        .attr("cy", yScale(point[valueKey]))
        .attr("r", 5)
        .style("fill", color)
        .style("stroke", "black")
        .style("stroke-width", 1.5);
}

const scenes = [
    {
        id: "#chart1",
        init: function() {
            const svg = d3.select(this.id).select("svg");
            if (svg.empty()) {
                d3.select(this.id).append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            }

            const g = d3.select(this.id).select("svg g");
            g.selectAll("*").remove();  // Clear previous content

            console.log("Initializing Scene 1...");
            // Load data and create the first chart
            if (data.mortgageData.length === 0 || data.priceData.length === 0) {
                Promise.all([
                    d3.csv("30YearMortgageAverage.csv", d => ({DATE: parseTime(d.DATE), MORTGAGE30US: +d.MORTGAGE30US / 100})),
                    d3.csv("MedianSalesPriceOfHousesSold.csv", d => ({DATE: parseTime(d.DATE), MSPUS: +d.MSPUS}))
                ]).then(function([mortgageData, priceData]) {
                    data.mortgageData = mortgageData;
                    data.priceData = priceData;
                    initializeScene1(g);
                }).catch(error => console.error('Error loading the CSV files for Scene 1:', error));
            } else {
                initializeScene1(g);
            }
        }
    },
    {
        id: "#chart2",
        init: function() {
            const svg = d3.select(this.id).select("svg");
            if (svg.empty()) {
                d3.select(this.id).append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            }

            const g = d3.select(this.id).select("svg g");
            g.selectAll("*").remove();  // Clear previous content

            console.log("Initializing Scene 2...");
            // Load data and create the second chart
            if (data.mortgageData.length === 0 || data.priceData.length === 0) {
                Promise.all([
                    d3.csv("30YearMortgageAverage.csv", d => ({DATE: parseTime(d.DATE), MORTGAGE30US: +d.MORTGAGE30US / 100})),
                    d3.csv("MedianSalesPriceOfHousesSold.csv", d => ({DATE: parseTime(d.DATE), MSPUS: +d.MSPUS}))
                ]).then(function([mortgageData, priceData]) {
                    data.mortgageData = mortgageData;
                    data.priceData = priceData;
                    initializeScene2(g);
                }).catch(error => console.error('Error loading the CSV files for Scene 2:', error));
            } else {
                initializeScene2(g);
            }
        }
    },
    {
        id: "#chart3",
        init: function() {
            const svg = d3.select(this.id).select("svg");
            if (svg.empty()) {
                d3.select(this.id).append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            }

            const g = d3.select(this.id).select("svg g");
            g.selectAll("*").remove();  // Clear previous content

            console.log("Initializing Scene 3...");
            // Load data and create the third chart
            if (data.mortgageData.length === 0 || data.priceData.length === 0 || data.mortgageCostData.length === 0 || typeof data.incomeData === 'undefined') {
                Promise.all([
                    d3.csv("30YearMortgageAverage.csv", d => ({DATE: parseTime(d.DATE), MORTGAGE30US: +d.MORTGAGE30US / 100})),
                    d3.csv("MedianSalesPriceOfHousesSold.csv", d => ({DATE: parseTime(d.DATE), MSPUS: +d.MSPUS})),
                    d3.csv("MedianFamilyIncome.csv", d => ({DATE: parseTime(d.DATE), MEFAINUSA646N: +d.MEFAINUSA646N}))
                ]).then(function([mortgageData, priceData, incomeData]) {
                    data.mortgageData = mortgageData;
                    data.priceData = priceData;
                    data.incomeData = incomeData;
                    initializeScene3(g);
                }).catch(error => console.error('Error loading the CSV files for Scene 3:', error));
            } else {
                initializeScene3(g);
            }
        }
    }
];
const formatComma = d3.format(",.0f");

function initializeScene1(g) {
    x.domain(d3.extent(data.mortgageData, d => d.DATE));
    y0.domain([0, d3.max(data.mortgageData, d => d.MORTGAGE30US)]);
    y1.domain([0, d3.max(data.priceData, d => d.MSPUS)]);

    const pathMortgage = g.append("path")
        .data([data.mortgageData])
        .attr("class", "line")
        .attr("d", lineMortgage)
        .attr("stroke", "blue")
        .attr("fill", "none");

    const totalLengthMortgage = pathMortgage.node().getTotalLength();

    pathMortgage
        .attr("stroke-dasharray", totalLengthMortgage + " " + totalLengthMortgage)
        .attr("stroke-dashoffset", totalLengthMortgage)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

    const pathPrice = g.append("path")
        .data([data.priceData])
        .attr("class", "line")
        .attr("d", linePrice)
        .attr("stroke", "green")
        .attr("fill", "none");

    const totalLengthPrice = pathPrice.node().getTotalLength();

    pathPrice
        .attr("stroke-dasharray", totalLengthPrice + " " + totalLengthPrice)
        .attr("stroke-dashoffset", totalLengthPrice)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

    g.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "axis axis--left")
        .call(d3.axisLeft(y0).ticks(6).tickFormat(d3.format(".0%")));
    
    g.append("g")
        .attr("class", "axis axis--right")
        .attr("transform", "translate(" + width + " ,0)")
        .call(d3.axisRight(y1).ticks(6).tickFormat(d3.format("$,.0f")));
    
    g.append("text")
        .attr("transform", "translate(" + (-margin.left/2 + 65) + "," + y0(data.mortgageData[0].MORTGAGE30US) + ")")
        .attr("dy", ".35em")
        .attr("text-anchor", "start")
        .style("fill", "blue")
        .style("font-size", "16px")
        .text("30 Year Mortgage Rate Avg.");

    g.append("text")
        .attr("transform", "translate(" + (-margin.left/2 + 50) + "," + y1(data.priceData[0].MSPUS-30) + ")")
        .attr("dy", ".35em")
        .attr("text-anchor", "start")
        .style("fill", "green")
        .style("font-size", "16px")
        .text("Median Sales Price of Houses Sold");

    // Add final value labels
    g.append("text")
        .attr("transform", "translate(" + (width + margin.right/2 + 10) + "," + y0(data.mortgageData[data.mortgageData.length - 1].MORTGAGE30US) + ")")
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .style("fill", "blue")
        .style("font-size", "12px")
        .text((data.mortgageData[data.mortgageData.length - 1].MORTGAGE30US * 100).toFixed(2) + "%");
    
    g.append("text")
        .attr("transform", "translate(" + (width + margin.right/2 + 15) + "," + y1(data.priceData[data.priceData.length - 1].MSPUS) + ")")
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .style("fill", "green")
        .style("font-size", "12px")
        .text("$" + formatComma(data.priceData[data.priceData.length - 1].MSPUS));

         // Add annotations
    const minMortgageRate = d3.min(data.mortgageData, d => d.MORTGAGE30US);
    const maxMortgageRate = d3.max(data.mortgageData, d => d.MORTGAGE30US);
    const minMortgageData = data.mortgageData.find(d => d.MORTGAGE30US === minMortgageRate);
    const maxMortgageData = data.mortgageData.find(d => d.MORTGAGE30US === maxMortgageRate);

    const annotations = [
        {
            note: { label: d3.timeFormat("%d-%b-%y")(minMortgageData.DATE), title: (minMortgageRate * 100).toFixed(2) + "%" },
            x: x(minMortgageData.DATE),
            y: y0(minMortgageRate),
            dy: 20,
            dx: -20,
            color: "gray"
        },
        {
            note: { label: d3.timeFormat("%d-%b-%y")(maxMortgageData.DATE), title: (maxMortgageRate * 100).toFixed(2) + "%" },
            x: x(maxMortgageData.DATE),
            y: y0(maxMortgageRate),
            dy: 30,
            dx: -30,
            color: "gray"
        }
    ];

    const makeAnnotations = d3.annotation()
        .annotations(annotations);

    g.append("g")
        .attr("class", "annotation-group")
        .call(makeAnnotations);
        
    g.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", function(event) {
            const [mouseX, mouseY] = d3.pointer(event);
            const mouseDate = x.invert(mouseX);
            
            const bisectDate = d3.bisector(d => d.DATE).left;

            const mortgageIndex = bisectDate(data.mortgageData, mouseDate, 1);
            const mortgagePoint = data.mortgageData[mortgageIndex - 1] || data.mortgageData[mortgageIndex];

            const priceIndex = bisectDate(data.priceData, mouseDate, 1);
            const pricePoint = data.priceData[priceIndex - 1] || data.priceData[priceIndex];

            updateTooltip(event, mouseDate, mortgagePoint, pricePoint);
            updateDots(g, x, y0, data.mortgageData, mouseDate, "mortgage30us", "blue");
            updateDots(g, x, y1, data.priceData, mouseDate, "mspus", "green");
        })
        .on("mouseout", () => {
            tooltip.style("display", "none");
            g.selectAll(".mortgage30us").remove();
            g.selectAll(".mspus").remove();
        });
}


function initializeScene2(g) {
    const mortgageCostData = data.mortgageData.map(d => {
        const priceEntry = data.priceData.find(p => 
            p.DATE.getFullYear() === d.DATE.getFullYear() &&
            Math.ceil((p.DATE.getMonth() + 1) / 3) === Math.ceil((d.DATE.getMonth() + 1) / 3)
        );
        if (priceEntry) {
            const loanAmount = priceEntry.MSPUS * 0.8;
            const monthlyRate = d.MORTGAGE30US / 12;
            const numberOfPayments = 30 * 12;
            const monthlyCost = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
            return {DATE: d.DATE, MONTHLYCOST: monthlyCost};
        }
        return null;
    }).filter(d => d);

    data.mortgageCostData = mortgageCostData;
    x.domain(d3.extent(mortgageCostData, d => d.DATE));
    y2.domain([0, d3.max(mortgageCostData, d => d.MONTHLYCOST)]);

    const path = g.append("path")
        .data([mortgageCostData])
        .attr("class", "line")
        .attr("d", lineMortgageCost)
        .attr("stroke", "red")
        .attr("fill", "none");

    const totalLength = path.node().getTotalLength();

    path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

    g.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "axis axis--left")
        .call(d3.axisLeft(y2).ticks(6).tickFormat(d3.format("$,.0f")));

    g.append("text")
        .attr("transform", "translate(" + (-margin.left / 2 + 65) + "," + y2(data.mortgageCostData[0].MONTHLYCOST) + ")")
        .attr("dy", ".35em")
        .attr("text-anchor", "start")
        .style("fill", "red")
        .style("font-size", "16px")
        .text("Monthly Cost of Median Mortgage");

    const formatComma = d3.format(",.0f");  // Define formatComma
    g.append("text")
        .attr("transform", "translate(" + (width + margin.right / 2 + 10) + "," + y2(data.mortgageCostData[data.mortgageCostData.length - 1].MONTHLYCOST) + ")")
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .style("fill", "red")
        .style("font-size", "12px")
        .text("$" + formatComma(data.mortgageCostData[data.mortgageCostData.length - 1].MONTHLYCOST));
    
        const calculateCAGR = (startValue, endValue, startDate, endDate) => {
            const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);
            return ((endValue / startValue) ** (1 / years) - 1) * 100;
        };
        // Calculate annotations points
    const firstDataPoint = data.mortgageCostData[0];
    const lastDataPoint2020 = data.mortgageCostData.filter(d => d.DATE.getFullYear() === 2020).pop();
    const lastDataPoint = data.mortgageCostData[data.mortgageCostData.length - 1];
        const cagr1970To2020 = calculateCAGR(firstDataPoint.MONTHLYCOST, lastDataPoint2020.MONTHLYCOST, firstDataPoint.DATE, lastDataPoint2020.DATE);
        const cagr2020ToNow = calculateCAGR(lastDataPoint2020.MONTHLYCOST, lastDataPoint.MONTHLYCOST, lastDataPoint2020.DATE, lastDataPoint.DATE);
    
        const annotations = [
            // {
            //     note: { label: "CAGR 1970-2020", title: cagr1970To2020.toFixed(2) + "%" },
            //     x: x(firstDataPoint.DATE),
            //     y: y1(firstDataPoint.MONTHLYCOST),
            //     dy: 30,
            //     dx: -30,
            //     color: "green"
            // },
            {
                note: { label: "CAGR 1970-2020", title: cagr1970To2020.toFixed(2) + "%" },
                x: x(lastDataPoint2020.DATE),
                y: y2(lastDataPoint2020.MONTHLYCOST),
                dy: 50,
                dx: -20,
                color: "gray"
            },
            {
                note: { label: "CAGR 2020-now", title: cagr2020ToNow.toFixed(2) + "%" },
                x: x(lastDataPoint.DATE),
                y: y2(lastDataPoint.MONTHLYCOST),
                dy: 30,
                dx: -35,
                color: "gray"
            }
        ];
    
        const makeAnnotations = d3.annotation()
            .annotations(annotations);
    
        g.append("g")
            .attr("class", "annotation-group")
            .call(makeAnnotations);

    g.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", function(event) {
            const [mouseX, mouseY] = d3.pointer(event);
            const mouseDate = x.invert(mouseX);
            
            const bisectDate = d3.bisector(d => d.DATE).left;

            const mortgageIndex = bisectDate(data.mortgageData, mouseDate, 1);
            const mortgagePoint = data.mortgageData[mortgageIndex - 1] || data.mortgageData[mortgageIndex];

            const priceIndex = bisectDate(data.priceData, mouseDate, 1);
            const pricePoint = data.priceData[priceIndex - 1] || data.priceData[priceIndex];

            const monthlyCostIndex = bisectDate(data.mortgageCostData, mouseDate, 1);
            const monthlyCostPoint = data.mortgageCostData[monthlyCostIndex - 1] || data.mortgageCostData[monthlyCostIndex];

            updateTooltip2(event, mouseDate, mortgagePoint, pricePoint, monthlyCostPoint);
            updateDots2(g, x, y2, data.mortgageCostData, mouseDate, "monthlycost", "MONTHLYCOST", "red");
        })
        .on("mouseout", () => {
            tooltip.style("display", "none");
            g.selectAll(".monthlycost").remove();
        });
}


function initializeScene3(g) {
    const mortgageCostData = data.mortgageData.map(d => {
        const priceEntry = data.priceData.find(p => 
            p.DATE.getFullYear() === d.DATE.getFullYear() &&
            Math.ceil((p.DATE.getMonth() + 1) / 3) === Math.ceil((d.DATE.getMonth() + 1) / 3)
        );
        if (priceEntry) {
            const loanAmount = priceEntry.MSPUS * 0.8;
            const monthlyRate = d.MORTGAGE30US / 12;
            const numberOfPayments = 30 * 12;
            const monthlyCost = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
            return {DATE: d.DATE, MONTHLYCOST: monthlyCost};
        }
        return null;
    }).filter(d => d);

    const mortgageCostPercentageData = mortgageCostData.map(d => {
        const incomeEntry = data.incomeData.find(i => i.DATE.getFullYear() === d.DATE.getFullYear());
        if (incomeEntry) {
            const monthlyIncome = incomeEntry.MEFAINUSA646N / 12;
            const mortgageCostPercentage = (d.MONTHLYCOST / monthlyIncome);
            return {DATE: d.DATE, MORTGAGECOSTPERCENTAGE: mortgageCostPercentage};
        }
        return null;
    }).filter(d => d);

    data.mortgageCostData = mortgageCostData;
    data.mortgageCostPercentageData = mortgageCostPercentageData;

    x.domain(d3.extent(mortgageCostPercentageData, d => d.DATE));
    y3.domain([0, d3.max(mortgageCostPercentageData, d => d.MORTGAGECOSTPERCENTAGE)]);

    const path = g.append("path")
        .data([mortgageCostPercentageData])
        .attr("class", "line")
        .attr("d", lineMortgageCostPercentage)
        .attr("stroke", "purple")
        .attr("fill", "none");

    const totalLength = path.node().getTotalLength();

    path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

    g.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "axis axis--left")
        .call(d3.axisLeft(y3).ticks(6).tickFormat(d3.format(".0%")));
    
    g.append("text")
        .attr("transform", "translate(" + (-margin.left/2 + 70) + "," + y3(data.mortgageCostPercentageData[0].MORTGAGECOSTPERCENTAGE)  + ")")
        .attr("dy", ".35em")
        .attr("text-anchor", "start")
        .style("fill", "purple")
        .style("font-size", "16px")
        .text("Mortgage Cost as a % of Median Family Income");
        

    // Add final value labels
    g.append("text")
        .attr("transform", "translate(" + (width + margin.right / 2 + 10) + "," + y3(data.mortgageCostPercentageData[data.mortgageCostPercentageData.length - 1].MORTGAGECOSTPERCENTAGE) + ")")
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .style("fill", "purple")
        .style("font-size", "12px")
        .text((data.mortgageCostPercentageData[data.mortgageCostPercentageData.length - 1].MORTGAGECOSTPERCENTAGE * 100).toFixed(2) + "%");
    // Add a thin dashed gray horizontal line at 28%
    g.append("line")
        .attr("x1", 0)
        .attr("y1", y3(0.28))
        .attr("x2", width)
        .attr("y2", y3(0.28))
        .attr("stroke", "gray")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");
    
        const annotation = [
            {
                note: { label: "Affordable Level", title: "28%" },
                x: width - margin.right,
                y: y3(0.28),
                dy: -30,
                dx: -30,
                color: "gray"
            }
        ];
    
        const makeAnnotation = d3.annotation()
            .annotations(annotation);
    
        g.append("g")
            .attr("class", "annotation-group")
            .call(makeAnnotation);

    g.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", function(event) {
            const [mouseX, mouseY] = d3.pointer(event);
            const mouseDate = x.invert(mouseX);
            
            const bisectDate = d3.bisector(d => d.DATE).left;

            const monthlyCostPercentageIndex = bisectDate(data.mortgageCostPercentageData, mouseDate, 1);
            const monthlyCostPercentagePoint = data.mortgageCostPercentageData[monthlyCostPercentageIndex - 1] || data.mortgageCostPercentageData[monthlyCostPercentageIndex];

            updateTooltip3(event, mouseDate, monthlyCostPercentagePoint);
            updateDots3(g, x, y3, data.mortgageCostPercentageData, mouseDate, "mortgagecostpercentage", "MORTGAGECOSTPERCENTAGE", "purple");
        })
        .on("mouseout", () => {
            tooltip.style("display", "none");
            g.selectAll(".mortgagecostpercentage").remove();
        });
}

function showScene(index) {
    d3.selectAll(".scene").classed("active", false);
    d3.selectAll(".text").classed("active", false);
    
    const scene = scenes[index];
    d3.select(scene.id).classed("active", true);
    d3.select(`#text${index + 1}`).classed("active", true);

    scene.init();
}

d3.select("#next").on("click", () => {
    currentScene = (currentScene + 1) % scenes.length;
    showScene(currentScene);
});



// Initialize the first scene
showScene(0);
