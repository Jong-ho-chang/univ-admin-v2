document.addEventListener("DOMContentLoaded", () => {
  const inputs = {
    year: document.getElementById("year"),
    univ: document.getElementById("univ"),
    type: document.getElementById("type"),
    dept: document.getElementById("dept")
  };

  const tableHead = document.getElementById("table-head");
  const tableBody = document.getElementById("table-body");
  const chartCanvas = document.getElementById("chart");
  const drawChartBtn = document.getElementById("draw-chart");

  let chart;
  let columns = [];
  let currentFiltered = [];

  const initializeTable = () => {
    columns = Object.keys(data[0]);
    tableHead.innerHTML = "<tr><th>선택</th>" + columns.map(col => `<th>${col}</th>`).join("") + "</tr>";
  };

  const renderTable = (filtered) => {
    currentFiltered = filtered;
    tableBody.innerHTML = filtered.map((row, idx) => {
      return "<tr>" +
        `<td><input type='checkbox' class='row-check' data-idx='${idx}'></td>` +
        columns.map(col => `<td>${row[col] || ""}</td>`).join("") +
        "</tr>";
    }).join("");
  };

  const filterData = () => {
    const conditions = {
      연도: inputs.year.value.trim().toLowerCase(),
      대학명: inputs.univ.value.trim().toLowerCase(),
      중심전형: inputs.type.value.trim().toLowerCase(),
      모집단위: inputs.dept.value.trim().toLowerCase()
    };

    const filtered = data.filter(row =>
      (!conditions.연도 || String(row["연도"]).includes(conditions.연도)) &&
      (!conditions.대학명 || (row["대학명"] || "").toLowerCase().includes(conditions.대학명)) &&
      (!conditions.중심전형 || (row["중심전형"] || "").toLowerCase().includes(conditions.중심전형)) &&
      (!conditions.모집단위 || (row["모집단위"] || "").toLowerCase().includes(conditions.모집단위))
    ).sort((a, b) => a["연도"] - b["연도"]);

    initializeTable();
    renderTable(filtered);
  };

  const drawChart = () => {
    const selectedIdxs = Array.from(document.querySelectorAll(".row-check:checked"))
      .map(chk => parseInt(chk.dataset.idx));

    const selectedRows = selectedIdxs.map(idx => currentFiltered[idx]);
    const labels = selectedRows.map(r => r["연도"] + " " + r["중심전형"]);

    const mainMetric = document.querySelector("input[name='graph-type']:checked").value;

    const datasets = [
      {
        label: mainMetric,
        data: selectedRows.map(r => Number(r[mainMetric]) || null),
        borderColor: "#007bff",
        borderWidth: 2,
        yAxisID: "y1",
        tension: 0.2
      },
      {
        label: "경쟁률",
        data: selectedRows.map(r => Number(r["경쟁률"]) || null),
        borderColor: "#ff6f00",
        borderWidth: 2,
        yAxisID: "y2",
        tension: 0.2
      }
    ];

    if (chart) chart.destroy();
    chart = new Chart(chartCanvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        stacked: false,
        scales: {
          y1: {
            type: "linear",
            position: "left",
            title: { display: true, text: "환산/등급" }
          },
          y2: {
            type: "linear",
            position: "right",
            title: { display: true, text: "경쟁률" },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  };

  Object.values(inputs).forEach(input =>
    input.addEventListener("input", () => {
      const anyInput = Object.values(inputs).some(inp => inp.value.trim() !== "");
      if (anyInput) filterData();
      else {
        tableBody.innerHTML = "";
        tableHead.innerHTML = "";
        if (chart) chart.destroy();
        currentFiltered = [];
      }
    })
  );

  drawChartBtn.addEventListener("click", drawChart);
});