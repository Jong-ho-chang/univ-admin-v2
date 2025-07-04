let filteredData = [];
let searchTimeout; // 디바운싱을 위한 타이머

// 실시간 검색을 위한 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', function() {
  // 데이터 확인
  console.log("데이터 개수:", data.length);
  console.log("첫 번째 행:", data[0]);
  
  // 전형명에서 "전형" 접미사 제거 (간단한 처리)
  data.forEach(row => {
    if (row["전형명"] && row["전형명"].endsWith("전형")) {
      row["전형명"] = row["전형명"].slice(0, -2);
    }
  });
  
  // 전형명 통계 출력 (디버깅용)
  const typeStats = {};
  data.forEach(row => {
    const type = row["전형명"];
    typeStats[type] = (typeStats[type] || 0) + 1;
  });
  console.log("처리된 전형명 통계:", typeStats);
  
  const yearInput = document.getElementById("yearInput");
  const univInput = document.getElementById("univInput");
  const typeInput = document.getElementById("typeInput");
  const majorInput = document.getElementById("majorInput");

  // input 요소 확인
  console.log("yearInput:", yearInput);
  console.log("univInput:", univInput);
  console.log("typeInput:", typeInput);
  console.log("majorInput:", majorInput);

  // 입력 시 실시간 검색 (디바운싱 적용)
  yearInput.addEventListener('input', () => debouncedSearch(false));
  univInput.addEventListener('input', () => debouncedSearch(false));
  
  // 대학명 자동완성 선택 시 정확한 검색 (브라우저 호환성 강화)
  univInput.addEventListener('change', () => {
    clearTimeout(searchTimeout);
    setTimeout(() => searchData(true), 0);
  });
  
  // Edge 브라우저 호환성을 위한 추가 이벤트
  univInput.addEventListener('blur', () => {
    const currentValue = univInput.value.trim();
    if (currentValue) {
      // 자동완성 목록에서 정확히 일치하는 항목이 있는지 확인
      const datalist = document.getElementById("univInput").list;
      if (datalist) {
        const exactMatch = Array.from(datalist.options).some(option => option.value === currentValue);
        if (exactMatch) {
          clearTimeout(searchTimeout);
          setTimeout(() => searchData(true), 0);
        }
      }
    }
  });
  
  typeInput.addEventListener('input', () => debouncedSearch(false));
  majorInput.addEventListener('input', () => debouncedSearch(false));

  // 입력창 초기화 시 즉시 빈 결과 반환 (성능 최적화)
  yearInput.addEventListener('keyup', (e) => {
    if (e.key === 'Escape' || (e.key === 'Backspace' && yearInput.value === '')) {
      clearTimeout(searchTimeout);
      searchData(false);
    }
  });
  univInput.addEventListener('keyup', (e) => {
    if (e.key === 'Escape' || (e.key === 'Backspace' && univInput.value === '')) {
      clearTimeout(searchTimeout);
      searchData(false);
    }
  });
  typeInput.addEventListener('keyup', (e) => {
    if (e.key === 'Escape' || (e.key === 'Backspace' && typeInput.value === '')) {
      clearTimeout(searchTimeout);
      searchData(false);
    }
  });
  majorInput.addEventListener('keyup', (e) => {
    if (e.key === 'Escape' || (e.key === 'Backspace' && majorInput.value === '')) {
      clearTimeout(searchTimeout);
      searchData(false);
    }
  });

  // 대학명 자동완성 기능
  setupUniversityAutocomplete();
  
  // 정렬 버튼 추가
  addSortButtons();
  
  // 초기에는 데이터를 표시하지 않음 (검색할 때만 표시)
  filteredData = [];
  renderTable(filteredData);
  updateChart();
});

// 디바운싱 함수 (성능 최적화)
function debouncedSearch(isExact = false) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => searchData(isExact), 500); // 300ms → 500ms로 증가
}

// 대학명 자동완성 설정
function setupUniversityAutocomplete() {
  const univInput = document.getElementById("univInput");
  
  // 기존 데이터리스트가 있다면 제거
  const existingDatalist = document.getElementById('universityList');
  if (existingDatalist) {
    existingDatalist.remove();
  }
  
  // 정규화된 데이터에서 대학명 추출 (Set 사용으로 중복 제거 최적화)
  const uniqueUniversities = [...new Set(data.map(row => row["대학명"]))].sort();
  
  // 디버깅용 로그
  console.log("추출된 대학명 목록:", uniqueUniversities);
  console.log("대학명 개수:", uniqueUniversities.length);
  
  // 데이터리스트 생성
  const datalist = document.createElement('datalist');
  datalist.id = 'universityList';
  
  // DocumentFragment 사용으로 DOM 조작 최적화
  const fragment = document.createDocumentFragment();
  uniqueUniversities.forEach(univ => {
    const option = document.createElement('option');
    option.value = univ;
    fragment.appendChild(option);
  });
  datalist.appendChild(fragment);
  
  // body에 추가
  document.body.appendChild(datalist);
  
  // input에 list 속성 설정
  univInput.setAttribute('list', 'universityList');
  
  // 디버깅용 로그
  console.log("자동완성 설정 완료. datalist ID:", datalist.id);
  console.log("input list 속성:", univInput.getAttribute('list'));
  console.log("datalist options 개수:", datalist.children.length);
}

function searchData(isExact = false) {
  // 성능 최적화: 모든 입력이 비어있으면 빈 결과 반환
  const year = document.getElementById("yearInput").value.trim();
  const univ = document.getElementById("univInput").value.trim();
  const type = document.getElementById("typeInput").value.trim();
  const major = document.getElementById("majorInput").value.trim();

  // 모든 검색 조건이 비어있으면 빈 결과 반환 (성능 최적화)
  if (!year && !univ && !type && !major) {
    filteredData = [];
    renderTable(filteredData);
    updateChart();
    return;
  }

  // 대학명 검색 로직 개선 (브라우저 호환성 강화)
  let isExactUniversity = isExact;
  
  // 자동완성 목록에서 정확히 일치하는 항목이 있는지 확인
  if (univ && document.getElementById("univInput").list) {
    const datalist = document.getElementById("univInput").list;
    const exactMatch = Array.from(datalist.options).some(option => option.value === univ);
    isExactUniversity = isExactUniversity || exactMatch;
  }
  
  // 추가 검증: 입력값이 완전한 대학명인지 확인
  if (univ && !isExactUniversity) {
    const allUniversities = [...new Set(data.map(row => row["대학명"]))];
    const exactUniversityMatch = allUniversities.some(uni => uni === univ);
    isExactUniversity = exactUniversityMatch;
  }
  
  // 디버깅용 로그 (브라우저별 동작 확인)
  if (univ) {
    console.log(`검색 대학명: "${univ}"`);
    console.log(`정확한 검색 여부: ${isExactUniversity}`);
    console.log(`브라우저: ${navigator.userAgent}`);
  }

  // 성능 최적화: 검색 조건이 적을 때만 전체 검색
  let searchData = data;
  
  // 연도로 먼저 필터링 (가장 빠른 필터)
  if (year) {
    searchData = searchData.filter(row => row["연도"].toString().includes(year));
  }
  
  // 대학명으로 필터링
  if (univ) {
    const searchUniv = univ.trim();
    searchData = searchData.filter(row => {
      const rowUniv = (row["대학명"] || "").trim();
      
      if (isExactUniversity) {
        return rowUniv === searchUniv;
      } else {
        return rowUniv.toLowerCase().includes(searchUniv.toLowerCase());
      }
    });
  }
  
  // 전형명으로 필터링
  if (type) {
    const searchType = type.trim();
    searchData = searchData.filter(row => {
      const rowMainType = (row["중심전형"] || "").trim();
      if (isExact) {
        return rowMainType.toLowerCase() === searchType.toLowerCase();
      } else {
        return rowMainType.toLowerCase().includes(searchType.toLowerCase());
      }
    });
  }
  
  // 모집단위로 필터링
  if (major) {
    searchData = searchData.filter(row => row["모집단위"].includes(major));
  }

  filteredData = searchData;
  renderTable(filteredData);
  updateChart();
}

function renderTable(data) {
  const table = document.getElementById("resultTable");
  table.innerHTML = "";

  if (data.length === 0) {
    table.innerHTML = "<tr><td colspan='100'>조회 결과가 없습니다.</td></tr>";
    return;
  }

  const headers = Object.keys(data[0]);
  // 체크박스 헤더 추가
  const thead = "<tr><th><input type='checkbox' id='selectAll' onchange='toggleAllRows()'> 전체선택</th>" + 
                headers.map(h => `<th class="sortable-header" onclick="sortByColumn('${h}')">${h} <span class="sort-icon">↕</span></th>`).join("") + "</tr>";
  
  const rows = data.map((row, index) => {
    const checkbox = `<input type='checkbox' class='row-checkbox' data-index='${index}' onchange='updateChart()'>`;
    return "<tr>" + `<td>${checkbox}</td>` + 
           headers.map(h => `<td>${row[h] || ""}</td>`).join("") + "</tr>";
  }).join("");

  table.innerHTML = thead + rows;
  
  // 전형명 컬럼 인덱스 찾기 (체크박스 컬럼 때문에 +1)
  window.typeColumnIndex = headers.indexOf("전형명") + 1; // 체크박스 컬럼 때문에 +1
  window.majorColumnIndex = headers.indexOf("모집단위") + 1; // 체크박스 컬럼 때문에 +1
  window.yearColumnIndex = headers.indexOf("연도") + 1; // 체크박스 컬럼 때문에 +1
}

// 전체 선택/해제 기능
function toggleAllRows() {
  const selectAll = document.getElementById('selectAll');
  const checkboxes = document.querySelectorAll('.row-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAll.checked;
  });
  
  updateChart();
}

let chart;

function updateChart() {
  // 체크된 행들만 필터링
  const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
  const selectedData = Array.from(checkedBoxes).map(checkbox => 
    filteredData[parseInt(checkbox.dataset.index)]
  );

  if (selectedData.length === 0) {
    // 체크된 항목이 없으면 전체 데이터 사용
    selectedData.push(...filteredData);
  }

  const selected = Array.from(document.querySelectorAll('.combo-buttons input[type="checkbox"]:checked'))
                        .map(input => input.value);
  
  const showTrendLine = document.getElementById('showTrendLine').checked;

  if (chart) chart.destroy();

  // 경쟁률과 다른 지표들을 분리
  const competitionData = selectedData.filter(row => {
    const val = parseFloat(row["경쟁률"]);
    return !isNaN(val) && val > 0;
  });

  const otherData = selectedData.filter(row => {
    // 경쟁률이 아닌 다른 지표들 중 하나라도 유효한 값이 있는지 확인
    return selected.some(type => {
      if (type === "경쟁률") return false;
      const val = parseFloat(row[getColumnKey(type)]);
      return !isNaN(val) && val > 0;
    });
  });

  // 경쟁률 차트 (왼쪽 Y축)
  const competitionDatasets = [];
  if (selected.includes("경쟁률") && competitionData.length > 0) {
    const groupedCompetition = {};
    competitionData.forEach(row => {
      const key = row["연도"];
      if (!groupedCompetition[key]) groupedCompetition[key] = [];
      groupedCompetition[key].push(row);
    });

    const years = Object.keys(groupedCompetition).sort();
    competitionDatasets.push({
      label: "경쟁률",
      data: years.map(year => {
        const avg = groupedCompetition[year].reduce((sum, row) => {
          const val = parseFloat(row["경쟁률"]);
          return isNaN(val) ? sum : sum + val;
        }, 0) / groupedCompetition[year].length;
        return parseFloat(avg.toFixed(2));
      }),
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderWidth: 3,
      fill: false,
      yAxisID: 'y'
    });
    
    // 경쟁률 추세선 추가
    if (showTrendLine) {
      const trendLine = calculateTrendLine(competitionData, "경쟁률");
      if (trendLine) {
        competitionDatasets.push({
          label: "경쟁률 추세선 (2026 예측)",
          data: trendLine.trendPoints.map(point => point.value),
          borderColor: 'rgba(255, 99, 132, 0.6)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          yAxisID: 'y',
          pointRadius: 0
        });
      }
    }
  }

  // 다른 지표들 차트 (오른쪽 Y축)
  const otherDatasets = [];
  const otherSelected = selected.filter(type => type !== "경쟁률");
  
  if (otherSelected.length > 0 && otherData.length > 0) {
    const groupedOther = {};
    otherData.forEach(row => {
      const key = row["연도"];
      if (!groupedOther[key]) groupedOther[key] = [];
      groupedOther[key].push(row);
    });

    const years = Object.keys(groupedOther).sort();
    
    otherSelected.forEach((type, index) => {
      const colors = [
        { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' },   // 파란색 - 등급 50%
        { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' },   // 청록색 - 등급 70%
        { border: 'rgb(255, 205, 86)', background: 'rgba(255, 205, 86, 0.2)' },   // 노란색 - 등급 85%
        { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.2)' }, // 보라색 - 등급 90%
        { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' },   // 빨간색 - 환산 50%
        { border: 'rgb(255, 159, 64)', background: 'rgba(255, 159, 64, 0.2)' },   // 주황색 - 환산 70%
        { border: 'rgb(201, 203, 207)', background: 'rgba(201, 203, 207, 0.2)' }  // 회색 - 추가 색상
      ];
      
      const label = type.includes("등급") ? type.replace("등급_", "교과등급 ") :
                   type.includes("환산") ? type.replace("환산_", "환산점수 ") : type;
      
      otherDatasets.push({
        label,
        data: years.map(year => {
          const avg = groupedOther[year].reduce((sum, row) => {
            const val = parseFloat(row[getColumnKey(type)]);
            return isNaN(val) ? sum : sum + val;
          }, 0) / groupedOther[year].length;
          return parseFloat(avg.toFixed(2));
        }),
        borderColor: colors[index % colors.length].border,
        backgroundColor: colors[index % colors.length].background,
        borderWidth: 2,
        fill: false,
        yAxisID: 'y1'
      });
      
      // 추세선 추가
      if (showTrendLine) {
        const trendLine = calculateTrendLine(otherData, getColumnKey(type));
        if (trendLine) {
          otherDatasets.push({
            label: `${label} 추세선 (2026 예측)`,
            data: trendLine.trendPoints.map(point => point.value),
            borderColor: colors[index % colors.length].border.replace('rgb', 'rgba').replace(')', ', 0.6)'),
            backgroundColor: colors[index % colors.length].background.replace('rgba', 'rgba').replace(')', ', 0.1)'),
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            yAxisID: 'y1',
            pointRadius: 0
          });
        }
      }
    });
  }

  const allDatasets = [...competitionDatasets, ...otherDatasets];
  const allYears = [...new Set([
    ...Object.keys(competitionData.reduce((acc, row) => { acc[row["연도"]] = true; return acc; }, {})),
    ...Object.keys(otherData.reduce((acc, row) => { acc[row["연도"]] = true; return acc; }, {}))
  ])].sort();
  
  // 추세선이 있으면 2026년 추가
  if (showTrendLine) {
    allYears.push("2026");
  }

  const ctx = document.getElementById("resultChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: allYears,
      datasets: allDatasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { 
          position: "top",
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        title: { 
          display: true, 
          text: showTrendLine ? "연도별 입시 결과 비교 + 2026년 추세 예측" : "연도별 입시 결과 비교 (경쟁률 vs Cut 점수)",
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(2);
                if (context.dataset.yAxisID === 'y') {
                  label += ' (경쟁률)';
                } else {
                  label += ' (Cut 점수)';
                }
                if (context.dataset.label.includes('추세선') && context.parsed.x === allYears.length - 1) {
                  label += ' (2026 예측)';
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: '연도'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: '경쟁률'
          },
          beginAtZero: true
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Cut 점수'
          },
          beginAtZero: false,
          reverse: true, // 등급은 낮을수록 좋으므로 Y축 반전
          grid: {
            drawOnChartArea: false,
          },
        }
      }
    }
  });
}

function getColumnKey(type) {
  switch (type) {
    case "경쟁률": return "경쟁률";
    case "등급_50": return "등급_50% cut";
    case "등급_70": return "등급_70% cut";
    case "등급_85": return "등급_85% cut";
    case "등급_90": return "등급_90% cut";
    case "환산_50": return "환산_50% cut";
    case "환산_70": return "환산_70% cut";
    default: return "";
  }
}

// 연도로 정렬하는 함수
function sortByYear() {
  const table = document.getElementById("resultTable");
  const rows = Array.from(table.querySelectorAll("tr")).slice(1); // 헤더 제외
  
  if (rows.length === 0) return;
  
  // 연도 컬럼 인덱스가 없으면 찾기 (체크박스 컬럼 때문에 +1)
  if (!window.yearColumnIndex) {
    const headerRow = table.querySelector("tr");
    const headers = Array.from(headerRow.querySelectorAll("th"));
    window.yearColumnIndex = headers.findIndex(th => th.textContent.includes("연도")) + 1;
    if (window.yearColumnIndex === 0) {
      alert("연도 컬럼을 찾을 수 없습니다.");
      return;
    }
  }
  
  // 현재 정렬 상태 확인
  const currentSort = table.getAttribute('data-multi-sort') || '';
  const hasTypeSort = currentSort.includes('type');
  const hasMajorSort = currentSort.includes('major');
  
  if (hasTypeSort && hasMajorSort) {
    // 전형명과 학과명 정렬이 이미 적용된 상태에서 연도 정렬 추가
    rows.sort((a, b) => {
      // 1차 정렬: 전형명 (기존 정렬 유지)
      const aType = a.cells[window.typeColumnIndex]?.textContent || "";
      const bType = b.cells[window.typeColumnIndex]?.textContent || "";
      const typeComparison = aType.localeCompare(bType);
      if (typeComparison !== 0) {
        return typeComparison;
      }
      
      // 2차 정렬: 학과명 (같은 전형 내에서)
      const aMajor = a.cells[window.majorColumnIndex]?.textContent || "";
      const bMajor = b.cells[window.majorColumnIndex]?.textContent || "";
      const majorComparison = aMajor.localeCompare(bMajor);
      if (majorComparison !== 0) {
        return majorComparison;
      }
      
      // 3차 정렬: 연도 (같은 전형, 같은 학과 내에서)
      const aYear = parseInt(a.cells[window.yearColumnIndex]?.textContent) || 0;
      const bYear = parseInt(b.cells[window.yearColumnIndex]?.textContent) || 0;
      return aYear - bYear;
    });
    table.setAttribute('data-multi-sort', 'type-major-year');
  } else if (hasTypeSort) {
    // 전형명 정렬이 이미 적용된 상태에서 연도 정렬 추가
    rows.sort((a, b) => {
      // 1차 정렬: 전형명 (기존 정렬 유지)
      const aType = a.cells[window.typeColumnIndex]?.textContent || "";
      const bType = b.cells[window.typeColumnIndex]?.textContent || "";
      const typeComparison = aType.localeCompare(bType);
      if (typeComparison !== 0) {
        return typeComparison;
      }
      
      // 2차 정렬: 연도 (같은 전형 내에서)
      const aYear = parseInt(a.cells[window.yearColumnIndex]?.textContent) || 0;
      const bYear = parseInt(b.cells[window.yearColumnIndex]?.textContent) || 0;
      return aYear - bYear;
    });
    table.setAttribute('data-multi-sort', 'type-year');
  } else if (hasMajorSort) {
    // 학과명 정렬이 이미 적용된 상태에서 연도 정렬 추가
    rows.sort((a, b) => {
      // 1차 정렬: 학과명 (기존 정렬 유지)
      const aMajor = a.cells[window.majorColumnIndex]?.textContent || "";
      const bMajor = b.cells[window.majorColumnIndex]?.textContent || "";
      const majorComparison = aMajor.localeCompare(bMajor);
      if (majorComparison !== 0) {
        return majorComparison;
      }
      
      // 2차 정렬: 연도 (같은 학과 내에서)
      const aYear = parseInt(a.cells[window.yearColumnIndex]?.textContent) || 0;
      const bYear = parseInt(b.cells[window.yearColumnIndex]?.textContent) || 0;
      return aYear - bYear;
    });
    table.setAttribute('data-multi-sort', 'major-year');
  } else {
    // 연도만으로 정렬
    rows.sort((a, b) => {
      const aYear = parseInt(a.cells[window.yearColumnIndex]?.textContent) || 0;
      const bYear = parseInt(b.cells[window.yearColumnIndex]?.textContent) || 0;
      return aYear - bYear;
    });
    table.setAttribute('data-multi-sort', 'year');
  }
  
  // 정렬된 행들을 다시 테이블에 추가
  rows.forEach(row => table.appendChild(row));
  
  // 정렬 완료 메시지
  const sortButton = document.querySelector('button[onclick="sortByYear()"]');
  if (sortButton) {
    const originalText = sortButton.textContent;
    const hasOtherSort = hasTypeSort || hasMajorSort;
    sortButton.textContent = hasOtherSort ? "연도 추가 정렬 완료!" : "연도 정렬 완료!";
    sortButton.style.background = '#6c757d';
    setTimeout(() => {
      sortButton.textContent = originalText;
      sortButton.style.background = '#6f42c1';
    }, 1000);
  }
}

// 전형명으로 정렬하는 함수
function sortByType() {
  const table = document.getElementById("resultTable");
  const rows = Array.from(table.querySelectorAll("tr")).slice(1); // 헤더 제외
  
  if (rows.length === 0) return;
  
  // 전형명 컬럼 인덱스가 없으면 찾기 (체크박스 컬럼 때문에 +1)
  if (!window.typeColumnIndex) {
    const headerRow = table.querySelector("tr");
    const headers = Array.from(headerRow.querySelectorAll("th"));
    window.typeColumnIndex = headers.findIndex(th => th.textContent.includes("전형명")) + 1;
    if (window.typeColumnIndex === 0) {
      alert("전형명 컬럼을 찾을 수 없습니다.");
      return;
    }
  }
  
  // 현재 정렬 상태 확인
  const currentSort = table.getAttribute('data-multi-sort') || '';
  const hasMajorSort = currentSort.includes('major');
  const hasYearSort = currentSort.includes('year');
  
  if (hasMajorSort && hasYearSort) {
    // 학과명과 연도 정렬이 이미 적용된 상태에서 전형 정렬 추가
    rows.sort((a, b) => {
      // 1차 정렬: 학과명 (기존 정렬 유지)
      const aMajor = a.cells[window.majorColumnIndex]?.textContent || "";
      const bMajor = b.cells[window.majorColumnIndex]?.textContent || "";
      const majorComparison = aMajor.localeCompare(bMajor);
      if (majorComparison !== 0) {
        return majorComparison;
      }
      
      // 2차 정렬: 연도 (같은 학과 내에서)
      const aYear = parseInt(a.cells[window.yearColumnIndex]?.textContent) || 0;
      const bYear = parseInt(b.cells[window.yearColumnIndex]?.textContent) || 0;
      const yearComparison = aYear - bYear;
      if (yearComparison !== 0) {
        return yearComparison;
      }
      
      // 3차 정렬: 전형명 (같은 학과, 같은 연도 내에서)
      const aType = a.cells[window.typeColumnIndex]?.textContent || "";
      const bType = b.cells[window.typeColumnIndex]?.textContent || "";
      return aType.localeCompare(bType);
    });
    table.setAttribute('data-multi-sort', 'major-year-type');
  } else if (hasMajorSort) {
    // 학과 정렬이 이미 적용된 상태에서 전형 정렬 추가
    rows.sort((a, b) => {
      // 1차 정렬: 학과명 (기존 정렬 유지)
      const aMajor = a.cells[window.majorColumnIndex]?.textContent || "";
      const bMajor = b.cells[window.majorColumnIndex]?.textContent || "";
      const majorComparison = aMajor.localeCompare(bMajor);
      if (majorComparison !== 0) {
        return majorComparison;
      }
      
      // 2차 정렬: 전형명 (같은 학과 내에서)
      const aType = a.cells[window.typeColumnIndex]?.textContent || "";
      const bType = b.cells[window.typeColumnIndex]?.textContent || "";
      return aType.localeCompare(bType);
    });
    table.setAttribute('data-multi-sort', 'major-type');
  } else if (hasYearSort) {
    // 연도 정렬이 이미 적용된 상태에서 전형 정렬 추가
    rows.sort((a, b) => {
      // 1차 정렬: 연도 (기존 정렬 유지)
      const aYear = parseInt(a.cells[window.yearColumnIndex]?.textContent) || 0;
      const bYear = parseInt(b.cells[window.yearColumnIndex]?.textContent) || 0;
      const yearComparison = aYear - bYear;
      if (yearComparison !== 0) {
        return yearComparison;
      }
      
      // 2차 정렬: 전형명 (같은 연도 내에서)
      const aType = a.cells[window.typeColumnIndex]?.textContent || "";
      const bType = b.cells[window.typeColumnIndex]?.textContent || "";
      return aType.localeCompare(bType);
    });
    table.setAttribute('data-multi-sort', 'year-type');
  } else {
    // 전형명만으로 정렬
    rows.sort((a, b) => {
      const aType = a.cells[window.typeColumnIndex]?.textContent || "";
      const bType = b.cells[window.typeColumnIndex]?.textContent || "";
      return aType.localeCompare(bType);
    });
    table.setAttribute('data-multi-sort', 'type');
  }
  
  // 정렬된 행들을 다시 테이블에 추가
  rows.forEach(row => table.appendChild(row));
  
  // 정렬 완료 메시지
  const sortButton = document.querySelector('button[onclick="sortByType()"]');
  if (sortButton) {
    const originalText = sortButton.textContent;
    const hasOtherSort = hasMajorSort || hasYearSort;
    sortButton.textContent = hasOtherSort ? "전형명 추가 정렬 완료!" : "전형명 정렬 완료!";
    sortButton.style.background = '#6c757d';
    setTimeout(() => {
      sortButton.textContent = originalText;
      sortButton.style.background = '#28a745';
    }, 1000);
  }
}

// 학과명(모집단위)으로 정렬하는 함수
function sortByMajor() {
  const table = document.getElementById("resultTable");
  const rows = Array.from(table.querySelectorAll("tr")).slice(1); // 헤더 제외
  
  if (rows.length === 0) return;
  
  // 모집단위 컬럼 인덱스가 없으면 찾기 (체크박스 컬럼 때문에 +1)
  if (!window.majorColumnIndex) {
    const headerRow = table.querySelector("tr");
    const headers = Array.from(headerRow.querySelectorAll("th"));
    window.majorColumnIndex = headers.findIndex(th => th.textContent.includes("모집단위")) + 1;
    if (window.majorColumnIndex === 0) {
      alert("모집단위 컬럼을 찾을 수 없습니다.");
      return;
    }
  }
  
  // 현재 정렬 상태 확인
  const currentSort = table.getAttribute('data-multi-sort') || '';
  const hasTypeSort = currentSort.includes('type');
  const hasYearSort = currentSort.includes('year');
  
  if (hasTypeSort && hasYearSort) {
    // 전형명과 연도 정렬이 이미 적용된 상태에서 학과 정렬 추가
    rows.sort((a, b) => {
      // 1차 정렬: 전형명 (기존 정렬 유지)
      const aType = a.cells[window.typeColumnIndex]?.textContent || "";
      const bType = b.cells[window.typeColumnIndex]?.textContent || "";
      const typeComparison = aType.localeCompare(bType);
      if (typeComparison !== 0) {
        return typeComparison;
      }
      
      // 2차 정렬: 연도 (같은 전형 내에서)
      const aYear = parseInt(a.cells[window.yearColumnIndex]?.textContent) || 0;
      const bYear = parseInt(b.cells[window.yearColumnIndex]?.textContent) || 0;
      const yearComparison = aYear - bYear;
      if (yearComparison !== 0) {
        return yearComparison;
      }
      
      // 3차 정렬: 학과명 (같은 전형, 같은 연도 내에서)
      const aMajor = a.cells[window.majorColumnIndex]?.textContent || "";
      const bMajor = b.cells[window.majorColumnIndex]?.textContent || "";
      return aMajor.localeCompare(bMajor);
    });
    table.setAttribute('data-multi-sort', 'type-year-major');
  } else if (hasTypeSort) {
    // 전형 정렬이 이미 적용된 상태에서 학과 정렬 추가
    rows.sort((a, b) => {
      // 1차 정렬: 전형명 (기존 정렬 유지)
      const aType = a.cells[window.typeColumnIndex]?.textContent || "";
      const bType = b.cells[window.typeColumnIndex]?.textContent || "";
      const typeComparison = aType.localeCompare(bType);
      if (typeComparison !== 0) {
        return typeComparison;
      }
      
      // 2차 정렬: 학과명 (같은 전형 내에서)
      const aMajor = a.cells[window.majorColumnIndex]?.textContent || "";
      const bMajor = b.cells[window.majorColumnIndex]?.textContent || "";
      return aMajor.localeCompare(bMajor);
    });
    table.setAttribute('data-multi-sort', 'type-major');
  } else if (hasYearSort) {
    // 연도 정렬이 이미 적용된 상태에서 학과 정렬 추가
    rows.sort((a, b) => {
      // 1차 정렬: 연도 (기존 정렬 유지)
      const aYear = parseInt(a.cells[window.yearColumnIndex]?.textContent) || 0;
      const bYear = parseInt(b.cells[window.yearColumnIndex]?.textContent) || 0;
      const yearComparison = aYear - bYear;
      if (yearComparison !== 0) {
        return yearComparison;
      }
      
      // 2차 정렬: 학과명 (같은 연도 내에서)
      const aMajor = a.cells[window.majorColumnIndex]?.textContent || "";
      const bMajor = b.cells[window.majorColumnIndex]?.textContent || "";
      return aMajor.localeCompare(bMajor);
    });
    table.setAttribute('data-multi-sort', 'year-major');
  } else {
    // 학과명만으로 정렬
    rows.sort((a, b) => {
      const aMajor = a.cells[window.majorColumnIndex]?.textContent || "";
      const bMajor = b.cells[window.majorColumnIndex]?.textContent || "";
      return aMajor.localeCompare(bMajor);
    });
    table.setAttribute('data-multi-sort', 'major');
  }
  
  // 정렬된 행들을 다시 테이블에 추가
  rows.forEach(row => table.appendChild(row));
  
  // 정렬 완료 메시지
  const sortButton = document.querySelector('button[onclick="sortByMajor()"]');
  if (sortButton) {
    const originalText = sortButton.textContent;
    const hasOtherSort = hasTypeSort || hasYearSort;
    sortButton.textContent = hasOtherSort ? "학과명 추가 정렬 완료!" : "학과명 정렬 완료!";
    sortButton.style.background = '#6c757d';
    setTimeout(() => {
      sortButton.textContent = originalText;
      sortButton.style.background = '#17a2b8';
    }, 1000);
  }
}

// 전형명과 학과명을 순서대로 정렬하는 함수
function sortByTypeAndMajor() {
  const table = document.getElementById("resultTable");
  const rows = Array.from(table.querySelectorAll("tr")).slice(1); // 헤더 제외
  
  if (rows.length === 0) return;
  
  // 컬럼 인덱스 확인
  if (!window.typeColumnIndex || !window.majorColumnIndex) {
    const headerRow = table.querySelector("tr");
    const headers = Array.from(headerRow.querySelectorAll("th"));
    window.typeColumnIndex = headers.findIndex(th => th.textContent.includes("전형명"));
    window.majorColumnIndex = headers.findIndex(th => th.textContent.includes("모집단위"));
    
    if (window.typeColumnIndex === -1 || window.majorColumnIndex === -1) {
      alert("전형명 또는 모집단위 컬럼을 찾을 수 없습니다.");
      return;
    }
  }
  
  // 전형명을 1차, 학과명을 2차 정렬로 설정
  rows.sort((a, b) => {
    const aType = a.cells[window.typeColumnIndex]?.textContent || "";
    const bType = b.cells[window.typeColumnIndex]?.textContent || "";
    
    // 1차 정렬: 전형명
    const typeComparison = aType.localeCompare(bType);
    if (typeComparison !== 0) {
      return typeComparison;
    }
    
    // 2차 정렬: 학과명 (전형명이 같을 때)
    const aMajor = a.cells[window.majorColumnIndex]?.textContent || "";
    const bMajor = b.cells[window.majorColumnIndex]?.textContent || "";
    return aMajor.localeCompare(bMajor);
  });
  
  table.setAttribute('data-multi-sort', 'type-major');
  
  // 정렬된 행들을 다시 테이블에 추가
  rows.forEach(row => table.appendChild(row));
  
  // 정렬 완료 메시지
  const sortButton = document.querySelector('button[onclick="sortByTypeAndMajor()"]');
  if (sortButton) {
    const originalText = sortButton.textContent;
    sortButton.textContent = "전형명+학과명 정렬 완료!";
    sortButton.style.background = '#6c757d';
    setTimeout(() => {
      sortButton.textContent = originalText;
      sortButton.style.background = '#fd7e14';
    }, 1000);
  }
}

// 정렬 버튼들 추가
function addSortButtons() {
  const chartContainer = document.getElementById("chartContainer");
  
  // 기존 정렬 버튼이 있다면 제거
  const existingButtons = document.querySelectorAll('.sort-button');
  existingButtons.forEach(btn => btn.remove());
  
  // 정렬 버튼들을 담을 컨테이너 생성
  const sortContainer = document.createElement("div");
  sortContainer.style.cssText = `
    display: flex;
    gap: 10px;
    margin-top: 10px;
    flex-wrap: wrap;
  `;
  
  // 연도별 추이 정렬 버튼 (주황색 - 가장 눈에 띄게)
  const trendSortButton = document.createElement("button");
  trendSortButton.textContent = "연도별 추이 정렬";
  trendSortButton.onclick = sortByYearlyTrend;
  trendSortButton.className = "sort-button";
  trendSortButton.style.cssText = `
    padding: 8px 12px;
    background: #fd7e14;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
    font-weight: bold;
  `;
  trendSortButton.onmouseover = () => trendSortButton.style.background = '#e8690b';
  trendSortButton.onmouseout = () => trendSortButton.style.background = '#fd7e14';
  
  // 연도 정렬 버튼
  const yearSortButton = document.createElement("button");
  yearSortButton.textContent = "연도로 정렬";
  yearSortButton.onclick = sortByYear;
  yearSortButton.className = "sort-button";
  yearSortButton.style.cssText = `
    padding: 8px 12px;
    background: #6f42c1;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  `;
  yearSortButton.onmouseover = () => yearSortButton.style.background = '#5a32a3';
  yearSortButton.onmouseout = () => yearSortButton.style.background = '#6f42c1';
  
  // 전형명 정렬 버튼
  const typeSortButton = document.createElement("button");
  typeSortButton.textContent = "전형명으로 정렬";
  typeSortButton.onclick = sortByType;
  typeSortButton.className = "sort-button";
  typeSortButton.style.cssText = `
    padding: 8px 12px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  `;
  typeSortButton.onmouseover = () => typeSortButton.style.background = '#218838';
  typeSortButton.onmouseout = () => typeSortButton.style.background = '#28a745';
  
  // 학과명 정렬 버튼
  const majorSortButton = document.createElement("button");
  majorSortButton.textContent = "학과명으로 정렬";
  majorSortButton.onclick = sortByMajor;
  majorSortButton.className = "sort-button";
  majorSortButton.style.cssText = `
    padding: 8px 12px;
    background: #17a2b8;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  `;
  majorSortButton.onmouseover = () => majorSortButton.style.background = '#138496';
  majorSortButton.onmouseout = () => majorSortButton.style.background = '#17a2b8';
  
  // 정렬 초기화 버튼
  const resetButton = document.createElement("button");
  resetButton.textContent = "정렬 초기화";
  resetButton.onclick = resetSort;
  resetButton.className = "sort-button";
  resetButton.style.cssText = `
    padding: 8px 12px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  `;
  resetButton.onmouseover = () => resetButton.style.background = '#c82333';
  resetButton.onmouseout = () => resetButton.style.background = '#dc3545';
  
  // 버튼들을 컨테이너에 추가 (연도별 추이 정렬을 맨 앞에 배치)
  sortContainer.appendChild(trendSortButton);
  sortContainer.appendChild(yearSortButton);
  sortContainer.appendChild(typeSortButton);
  sortContainer.appendChild(majorSortButton);
  sortContainer.appendChild(resetButton);
  
  // 컨테이너를 combo-buttons 다음에 추가
  const comboButtons = document.querySelector('.combo-buttons');
  comboButtons.appendChild(sortContainer);
}

// 컬럼별 정렬 함수
function sortByColumn(columnName) {
  const table = document.getElementById("resultTable");
  const rows = Array.from(table.querySelectorAll("tr")).slice(1); // 헤더 제외
  
  if (rows.length === 0) return;
  
  // 컬럼 인덱스 찾기
  const headerRow = table.querySelector("tr");
  const headers = Array.from(headerRow.querySelectorAll("th"));
  const columnIndex = headers.findIndex(th => th.textContent.includes(columnName));
  
  if (columnIndex === -1) {
    alert(`${columnName} 컬럼을 찾을 수 없습니다.`);
    return;
  }
  
  // 정렬 방향 결정 (현재 정렬 상태에 따라)
  const currentSort = table.getAttribute('data-sort');
  const isAscending = currentSort !== `${columnIndex}-asc`;
  
  rows.sort((a, b) => {
    const aValue = a.cells[columnIndex]?.textContent || "";
    const bValue = b.cells[columnIndex]?.textContent || "";
    
    // 숫자인지 확인
    const aNum = parseFloat(aValue);
    const bNum = parseFloat(bValue);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      // 숫자 정렬
      return isAscending ? aNum - bNum : bNum - aNum;
    } else {
      // 문자열 정렬
      return isAscending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
  });
  
  // 정렬된 행들을 다시 테이블에 추가
  rows.forEach(row => table.appendChild(row));
  
  // 정렬 상태 저장
  table.setAttribute('data-sort', `${columnIndex}-${isAscending ? 'asc' : 'desc'}`);
  
  // 정렬 아이콘 업데이트
  updateSortIcons(columnIndex, isAscending);
}

// 정렬 아이콘 업데이트
function updateSortIcons(sortedColumnIndex, isAscending) {
  const table = document.getElementById("resultTable");
  const headers = table.querySelectorAll("th.sortable-header");
  
  headers.forEach((header, index) => {
    const icon = header.querySelector(".sort-icon");
    if (index === sortedColumnIndex - 1) { // 체크박스 컬럼 때문에 -1
      icon.textContent = isAscending ? "↑" : "↓";
      header.style.color = "#007bff";
    } else {
      icon.textContent = "↕";
      header.style.color = "#6c757d";
    }
  });
}

// 정렬 초기화 함수
function resetSort() {
  const table = document.getElementById("resultTable");
  table.removeAttribute('data-multi-sort');
  
  // 원래 순서로 되돌리기 (검색 결과 순서)
  renderTable(filteredData);
  
  // 정렬 초기화 메시지
  const resetButton = document.querySelector('button[onclick="resetSort()"]');
  if (resetButton) {
    const originalText = resetButton.textContent;
    resetButton.textContent = "정렬 초기화 완료!";
    resetButton.style.background = '#6c757d';
    setTimeout(() => {
      resetButton.textContent = originalText;
      resetButton.style.background = '#dc3545';
    }, 1000);
  }
}

// 연도별 추이 정렬 함수 (같은 전형, 같은 학과를 연도별로 그룹화)
function sortByYearlyTrend() {
  const table = document.getElementById("resultTable");
  const rows = Array.from(table.querySelectorAll("tr")).slice(1); // 헤더 제외
  
  if (rows.length === 0) return;
  
  // 컬럼 인덱스 확인 (체크박스 컬럼 때문에 +1)
  if (!window.yearColumnIndex || !window.typeColumnIndex || !window.majorColumnIndex) {
    const headerRow = table.querySelector("tr");
    const headers = Array.from(headerRow.querySelectorAll("th"));
    window.yearColumnIndex = headers.findIndex(th => th.textContent.includes("연도")) + 1; // 체크박스 컬럼 때문에 +1
    window.typeColumnIndex = headers.findIndex(th => th.textContent.includes("전형명")) + 1; // 체크박스 컬럼 때문에 +1
    window.majorColumnIndex = headers.findIndex(th => th.textContent.includes("모집단위")) + 1; // 체크박스 컬럼 때문에 +1
    
    if (window.yearColumnIndex === 0 || window.typeColumnIndex === 0 || window.majorColumnIndex === 0) {
      alert("연도, 전형명, 모집단위 컬럼을 찾을 수 없습니다.");
      return;
    }
  }
  
  // 1차: 전형명, 2차: 학과명, 3차: 연도 순으로 정렬
  rows.sort((a, b) => {
    // 1차 정렬: 전형명
    const aType = a.cells[window.typeColumnIndex]?.textContent || "";
    const bType = b.cells[window.typeColumnIndex]?.textContent || "";
    const typeComparison = aType.localeCompare(bType);
    if (typeComparison !== 0) {
      return typeComparison;
    }
    
    // 2차 정렬: 학과명 (같은 전형 내에서)
    const aMajor = a.cells[window.majorColumnIndex]?.textContent || "";
    const bMajor = b.cells[window.majorColumnIndex]?.textContent || "";
    const majorComparison = aMajor.localeCompare(bMajor);
    if (majorComparison !== 0) {
      return majorComparison;
    }
    
    // 3차 정렬: 연도 (같은 전형, 같은 학과 내에서)
    const aYear = parseInt(a.cells[window.yearColumnIndex]?.textContent) || 0;
    const bYear = parseInt(b.cells[window.yearColumnIndex]?.textContent) || 0;
    return aYear - bYear;
  });
  
  table.setAttribute('data-multi-sort', 'yearly-trend');
  
  // 정렬된 행들을 다시 테이블에 추가
  rows.forEach(row => table.appendChild(row));
  
  // 정렬 완료 메시지
  const sortButton = document.querySelector('button[onclick="sortByYearlyTrend()"]');
  if (sortButton) {
    const originalText = sortButton.textContent;
    sortButton.textContent = "연도별 추이 정렬 완료!";
    sortButton.style.background = '#6c757d';
    setTimeout(() => {
      sortButton.textContent = originalText;
      sortButton.style.background = '#fd7e14';
    }, 1000);
  }
}

// 추세선 계산 함수 (선형 회귀)
function calculateTrendLine(data, metric) {
  if (data.length < 2) return null;
  
  // 연도별 평균값 계산
  const yearData = {};
  data.forEach(row => {
    const year = parseInt(row["연도"]);
    const value = parseFloat(row[metric]);
    if (!isNaN(value) && value > 0) {
      if (!yearData[year]) yearData[year] = [];
      yearData[year].push(value);
    }
  });
  
  // 연도별 평균 계산
  const averages = Object.keys(yearData).map(year => ({
    year: parseInt(year),
    avg: yearData[year].reduce((sum, val) => sum + val, 0) / yearData[year].length
  })).sort((a, b) => a.year - b.year);
  
  if (averages.length < 2) return null;
  
  // 선형 회귀 계산
  const n = averages.length;
  const sumX = averages.reduce((sum, point) => sum + point.year, 0);
  const sumY = averages.reduce((sum, point) => sum + point.avg, 0);
  const sumXY = averages.reduce((sum, point) => sum + point.year * point.avg, 0);
  const sumXX = averages.reduce((sum, point) => sum + point.year * point.year, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // 2026년 예측값 계산
  const prediction2026 = slope * 2026 + intercept;
  
  return {
    slope,
    intercept,
    prediction2026,
    trendPoints: averages.map(point => ({
      year: point.year,
      value: slope * point.year + intercept
    })).concat([{
      year: 2026,
      value: prediction2026
    }])
  };
}